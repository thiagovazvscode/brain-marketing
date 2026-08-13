/**
 * Backfill controlado dos leads REAIS da MV Imóveis — Fase 8 (habilitação
 * de leads_retrieval já homologada).
 *
 * Não roda em cron nem é chamado automaticamente por nada — é o script de
 * primeira carga, rodado manualmente uma vez (e de novo sempre que quiser
 * atualizar), com limite explícito de registros por formulário (backfill
 * "gigante" fica fora de escopo desta fase, conforme decisão explícita).
 *
 * Rodar: dotenv -e .env.local -- tsx scripts/sync-mv-imoveis-leads.ts
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaAdAccounts } from "@/db/schema";
import { syncMetaLeadsForClient } from "@/lib/meta/leads-sync";

const MV_IMOVEIS_SLUG = "mv-imoveis";
// Confirmado via creative.object_story_spec.page_id dos anúncios reais —
// mesma Page roda Village Natureza, Parque das Águas e Jacarandá.
const MV_IMOVEIS_PAGE_ID = "680986108707468";

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.error("META_ACCESS_TOKEN não definido em .env.local.");
    process.exit(1);
  }

  console.log("== 1. Configurando page_id no ad account da MV Imóveis ==");
  const [client] = await db.select().from(clients).where(eq(clients.slug, MV_IMOVEIS_SLUG)).limit(1);
  if (!client) {
    console.error("Cliente mv-imoveis não encontrado.");
    process.exit(1);
  }
  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);
  if (!adAccount) {
    console.error("Ad account da MV Imóveis não encontrada.");
    process.exit(1);
  }
  if (adAccount.pageId !== MV_IMOVEIS_PAGE_ID) {
    await db.update(metaAdAccounts).set({ pageId: MV_IMOVEIS_PAGE_ID, updatedAt: new Date() }).where(eq(metaAdAccounts.id, adAccount.id));
    console.log(`  page_id definido: ${MV_IMOVEIS_PAGE_ID}`);
  } else {
    console.log(`  page_id já estava correto: ${MV_IMOVEIS_PAGE_ID}`);
  }

  console.log("\n== 2. Sincronizando leads reais (até 200 por formulário) ==");
  const result = await syncMetaLeadsForClient(MV_IMOVEIS_SLUG, { systemUserToken: token, maxRecordsPerForm: 200 });

  console.log("\n== Resultado (sem PII — só contagens) ==");
  console.log(`  Formulários com leads escaneados: ${result.formsScanned}`);
  console.log(`  Leads buscados na Meta: ${result.leadsFetched}`);
  console.log(`  Leads gravados/atualizados: ${result.leadsUpserted}`);
  console.log(`  Descartados (campanha de outro cliente/desconhecida): ${result.leadsSkippedOtherCampaign}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("Falha na sincronização de leads:", error.message);
  process.exit(1);
});
