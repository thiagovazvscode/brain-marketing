import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { metaConnections, metaAdAccounts, metaSyncLogs, clients } from "@/db/schema";
import { decryptToken } from "./crypto";
import { fetchMe, fetchAdAccountDetails } from "./graph-client";
import { syncClientEntities, syncInsightsDaily } from "./sync";

// Uma sync "running" mais velha que isso é considerada travada (processo
// anterior morreu sem finalizar) — não bloqueia a próxima execução pra
// sempre. 10min é generoso pra uma sync real (entidades + insights de 1
// conta leva segundos a poucos minutos).
const LOCK_STALE_MINUTES = 10;

// Janela de re-sync incremental diária: hoje + 7 dias anteriores (8 dias).
// Motivo documentado (não é número arbitrário): a Meta pode ajustar
// atribuição de conversões por alguns dias após o evento original (cliques/
// visualizações que geram lead com atraso de atribuição); 7 dias de
// releitura cobre isso com folga — é o mesmo princípio de "attribution
// window" que a própria Meta usa internamente pros relatórios dela. Rodando
// diariamente, cada dia é re-lido ~7 vezes antes de "envelhecer" pra fora da
// janela, o que dá margem de segurança sem precisar reconsultar os ~120 dias
// de histórico completo em toda execução.
const INCREMENTAL_WINDOW_DAYS = 8;

export type SyncResult = {
  status: "success" | "partial" | "failed" | "skipped";
  campaignsSynced: number;
  adsetsSynced: number;
  adsSynced: number;
  insightsSynced: number;
  errorMessage?: string;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Serviço central de sincronização — chamável por cron, por endpoint manual
 * administrativo, ou futuramente por um painel admin. Não sabe nada sobre
 * "MV Imóveis" especificamente: recebe um clientId e sincroniza o que essa
 * connection/ad account tiverem.
 *
 * PASSO A: valida token (fetchMe)
 * PASSO B: atualiza dados da conta de anúncios
 * PASSO C-E: sincroniza campaigns/adsets/ads+creatives (syncClientEntities)
 * PASSO F-G: busca e persiste insights da janela incremental (syncInsightsDaily)
 * PASSO H: registra o resultado em meta_sync_logs
 */
export async function syncMetaAccount(clientId: string, trigger: "cron" | "manual" = "cron"): Promise<SyncResult> {
  const [connection] = await db.select().from(metaConnections).where(eq(metaConnections.clientId, clientId)).limit(1);
  if (!connection) {
    return { status: "failed", campaignsSynced: 0, adsetsSynced: 0, adsSynced: 0, insightsSynced: 0, errorMessage: "Cliente sem meta_connections." };
  }

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, clientId)).limit(1);
  if (!adAccount) {
    return { status: "failed", campaignsSynced: 0, adsetsSynced: 0, adsSynced: 0, insightsSynced: 0, errorMessage: "Cliente sem meta_ad_accounts." };
  }

  // Lock lógico via a própria tabela de log — sem infra extra (sem Redis
  // neste stack). Se já existe uma sync "running" recente pra essa conta,
  // não inicia outra concorrente.
  const [lastRunning] = await db
    .select()
    .from(metaSyncLogs)
    .where(and(eq(metaSyncLogs.adAccountId, adAccount.id), eq(metaSyncLogs.status, "running")))
    .orderBy(desc(metaSyncLogs.startedAt))
    .limit(1);

  if (lastRunning) {
    const staleThreshold = new Date(Date.now() - LOCK_STALE_MINUTES * 60000);
    if (lastRunning.startedAt > staleThreshold) {
      return { status: "skipped", campaignsSynced: 0, adsetsSynced: 0, adsSynced: 0, insightsSynced: 0, errorMessage: "Sincronização já em andamento para esta conta." };
    }
    // Trava expirada — o processo anterior não finalizou (provável crash).
    // Marca como falho pra não deixar uma sync "running" fantasma pra sempre.
    await db
      .update(metaSyncLogs)
      .set({ status: "failed", finishedAt: new Date(), errorMessage: "Trava expirada — processo anterior não finalizou." })
      .where(eq(metaSyncLogs.id, lastRunning.id));
  }

  const [log] = await db
    .insert(metaSyncLogs)
    .values({ clientId, adAccountId: adAccount.id, status: "running", trigger })
    .returning();

  let campaignsSynced = 0;
  let adsetsSynced = 0;
  let adsSynced = 0;
  let insightsSynced = 0;
  const stepErrors: string[] = [];

  try {
    // PASSO A — validar token. Se falhar aqui, nada mais pode prosseguir
    // (sem token válido não dá pra buscar nada), então é falha total, não parcial.
    const token = decryptToken(connection.accessTokenEncrypted);
    await fetchMe(token);

    // PASSO B — atualizar conta de anúncios
    const details = await fetchAdAccountDetails(adAccount.externalId, token);
    await db
      .update(metaAdAccounts)
      .set({
        name: details.name,
        currency: details.currency,
        timezoneName: details.timezone_name,
        accountStatus: details.account_status,
        updatedAt: new Date(),
      })
      .where(eq(metaAdAccounts.id, adAccount.id));

    await db
      .update(metaConnections)
      .set({ status: "connected", lastValidatedAt: new Date(), lastErrorMessage: null, updatedAt: new Date() })
      .where(eq(metaConnections.id, connection.id));

    // PASSO C-E — campanhas/conjuntos/anúncios+creatives. Falha aqui não
    // impede tentar os insights — por isso status pode virar "partial".
    try {
      const entities = await syncClientEntities(clientId, adAccount.id);
      campaignsSynced = entities.campaignsCount;
      adsetsSynced = entities.adsetsCount;
      adsSynced = entities.adsCount;
    } catch (err) {
      stepErrors.push(`entidades: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    }

    // PASSO F-G — insights da janela incremental (nunca o histórico completo)
    try {
      const until = new Date();
      const since = new Date(until);
      since.setDate(until.getDate() - (INCREMENTAL_WINDOW_DAYS - 1));
      insightsSynced = await syncInsightsDaily(clientId, adAccount.id, isoDate(since), isoDate(until));
    } catch (err) {
      stepErrors.push(`insights: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    }

    const status: SyncResult["status"] =
      stepErrors.length === 0 ? "success" : campaignsSynced > 0 || insightsSynced > 0 ? "partial" : "failed";
    const errorMessage = stepErrors.length ? stepErrors.join(" | ") : null;

    // PASSO H — registrar resultado
    await db
      .update(metaSyncLogs)
      .set({ status, finishedAt: new Date(), campaignsSynced, adsetsSynced, adsSynced, insightsSynced, errorMessage })
      .where(eq(metaSyncLogs.id, log.id));

    return { status, campaignsSynced, adsetsSynced, adsSynced, insightsSynced, errorMessage: errorMessage ?? undefined };
  } catch (err) {
    // Erro fatal (token inválido, conta inacessível) — nada foi sincronizado.
    // Nunca logar o token: err.message aqui é sempre o texto de erro que a
    // própria Meta retornou (ou uma mensagem nossa), nunca a URL assinada.
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    await db
      .update(metaConnections)
      .set({ status: "error", lastErrorMessage: message, updatedAt: new Date() })
      .where(eq(metaConnections.id, connection.id));
    await db
      .update(metaSyncLogs)
      .set({ status: "failed", finishedAt: new Date(), errorMessage: message })
      .where(eq(metaSyncLogs.id, log.id));
    return { status: "failed", campaignsSynced: 0, adsetsSynced: 0, adsSynced: 0, insightsSynced: 0, errorMessage: message };
  }
}

/**
 * Sincroniza TODOS os clientes com connection ativa — usado pelo cron.
 * Genérico: nunca filtra por slug. Se um cliente falhar, os outros
 * continuam (isolamento de falha por cliente).
 */
export async function syncAllActiveClients(trigger: "cron" | "manual" = "cron") {
  const activeConnections = await db
    .select({ clientId: metaConnections.clientId, clientSlug: clients.slug })
    .from(metaConnections)
    .innerJoin(clients, eq(clients.id, metaConnections.clientId))
    // Não filtra por status='connected': uma falha isolada (status vira
    // 'error') não pode excluir o cliente de tentativas futuras pra sempre,
    // senão um erro transitório numa execução vira exclusão permanente. Só
    // 'revoked' (desconexão explícita, quando esse fluxo existir) fica de fora.
    .where(ne(metaConnections.status, "revoked"));

  const results: { clientId: string; clientSlug: string; result: SyncResult }[] = [];
  for (const conn of activeConnections) {
    const result = await syncMetaAccount(conn.clientId, trigger).catch(
      (err): SyncResult => ({
        status: "failed",
        campaignsSynced: 0,
        adsetsSynced: 0,
        adsSynced: 0,
        insightsSynced: 0,
        errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
      })
    );
    results.push({ clientId: conn.clientId, clientSlug: conn.clientSlug, result });
  }
  return results;
}
