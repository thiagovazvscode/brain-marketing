/**
 * Bootstrap + primeira sincronização real da MV Imóveis.
 *
 * Não é a rotina genérica de sync (essa é src/lib/meta/sync.ts, reutilizável
 * pra qualquer cliente) — este script só faz o "find or create" específico
 * da MV Imóveis, usando a conta de anúncios já confirmada manualmente
 * (act_1294043869320088), e chama a rotina genérica em seguida.
 *
 * Rodar: dotenv -e .env.local -- tsx scripts/sync-mv-imoveis.ts
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaConnections, metaAdAccounts } from "@/db/schema";
import { encryptToken } from "@/lib/meta/crypto";
import { fetchMe, fetchTokenExpiry, fetchEarliestAvailableDate } from "@/lib/meta/graph-client";
import { syncClientEntities, syncInsightsDaily } from "@/lib/meta/sync";

const MV_IMOVEIS_SLUG = "mv-imoveis";
const MV_IMOVEIS_AD_ACCOUNT_EXTERNAL_ID = "act_1294043869320088"; // confirmado manualmente pelo usuário

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.error("META_ACCESS_TOKEN não definido em .env.local.");
    process.exit(1);
  }

  console.log("== 1. Cliente MV Imóveis (find or create em `clients`) ==");
  let [client] = await db.select().from(clients).where(eq(clients.slug, MV_IMOVEIS_SLUG)).limit(1);
  if (!client) {
    [client] = await db.insert(clients).values({ slug: MV_IMOVEIS_SLUG, name: "MV Imóveis" }).returning();
    console.log(`  Criado: id=${client.id}`);
  } else {
    console.log(`  Já existia: id=${client.id}`);
  }

  console.log("\n== 2. Meta connection (find or create) ==");
  const me = await fetchMe(token);
  const expiresAt = await fetchTokenExpiry(token);
  let [connection] = await db.select().from(metaConnections).where(eq(metaConnections.clientId, client.id)).limit(1);
  const encrypted = encryptToken(token);
  if (!connection) {
    [connection] = await db
      .insert(metaConnections)
      .values({
        clientId: client.id,
        externalUserId: me.id,
        externalUserName: me.name,
        status: "connected",
        accessTokenEncrypted: encrypted,
        expiresAt,
        lastValidatedAt: new Date(),
      })
      .returning();
    console.log(`  Criada: id=${connection.id}, usuário: ${me.name}, expira em: ${expiresAt ? expiresAt.toISOString() : "desconhecido/sem expiração"}`);
  } else {
    [connection] = await db
      .update(metaConnections)
      .set({ accessTokenEncrypted: encrypted, status: "connected", expiresAt, lastValidatedAt: new Date(), updatedAt: new Date() })
      .where(eq(metaConnections.id, connection.id))
      .returning();
    console.log(`  Já existia, token atualizado: id=${connection.id}, expira em: ${expiresAt ? expiresAt.toISOString() : "desconhecido/sem expiração"}`);
  }

  console.log("\n== 3. Ad account MV Imóveis (find or create) ==");
  let [adAccount] = await db
    .select()
    .from(metaAdAccounts)
    .where(eq(metaAdAccounts.externalId, MV_IMOVEIS_AD_ACCOUNT_EXTERNAL_ID))
    .limit(1);
  if (!adAccount) {
    [adAccount] = await db
      .insert(metaAdAccounts)
      .values({
        clientId: client.id,
        connectionId: connection.id,
        externalId: MV_IMOVEIS_AD_ACCOUNT_EXTERNAL_ID,
        name: "Conta 2 - MV IMOVEIS - Agência",
        currency: "BRL",
        timezoneName: "America/Sao_Paulo",
        accountStatus: 1,
      })
      .returning();
    console.log(`  Criada: id=${adAccount.id}`);
  } else {
    console.log(`  Já existia: id=${adAccount.id}`);
  }

  console.log("\n== 4. Sincronizando campanhas/conjuntos/anúncios ==");
  const entities = await syncClientEntities(client.id, adAccount.id);
  console.log(`  campanhas: ${entities.campaignsCount} | conjuntos: ${entities.adsetsCount} | anúncios: ${entities.adsCount}`);

  console.log("\n== 5. Descobrindo o primeiro dia real disponível na Meta ==");
  const earliest = await fetchEarliestAvailableDate(MV_IMOVEIS_AD_ACCOUNT_EXTERNAL_ID, token);
  const until = new Date();
  const since = earliest ? new Date(earliest) : new Date(until.getTime() - 89 * 86400000);
  console.log(`  Primeiro dia com dado real: ${earliest ?? "(não determinado, usando fallback de 90 dias)"}`);

  console.log(`\n== 6. Backfill de insights diários (${isoDate(since)} até ${isoDate(until)}, histórico real completo) ==`);
  const insightsCount = await syncInsightsDaily(client.id, adAccount.id, isoDate(since), isoDate(until));
  console.log(`  linhas de insight gravadas (upsert): ${insightsCount}`);

  console.log("\n== Fim. clientId=" + client.id + " adAccountId=" + adAccount.id + " ==");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha na sincronização:", error.message);
  process.exit(1);
});
