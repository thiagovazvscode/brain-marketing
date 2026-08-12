import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  metaConnections,
  metaAdAccounts,
  metaCampaigns,
  metaAdsets,
  metaAds,
  metaInsightsDaily,
} from "@/db/schema";

async function main() {
  const [client] = await db.select().from(clients).where(eq(clients.slug, "mv-imoveis")).limit(1);
  if (!client) throw new Error("Cliente não encontrado.");

  const [connection] = await db.select().from(metaConnections).where(eq(metaConnections.clientId, client.id)).limit(1);
  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);

  const [{ count: campaignCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(metaCampaigns).where(eq(metaCampaigns.clientId, client.id));
  const [{ count: adsetCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(metaAdsets).where(eq(metaAdsets.clientId, client.id));
  const [{ count: adCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(metaAds).where(eq(metaAds.clientId, client.id));
  const [{ count: insightCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(metaInsightsDaily).where(eq(metaInsightsDaily.clientId, client.id));
  const [{ count: adsWithThumb }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(metaAds)
    .where(sql`${metaAds.clientId} = ${client.id} and ${metaAds.thumbnailUrl} is not null`);

  console.log("== CONTAGENS ==");
  console.log(`clients: 1 (id=${client.id})`);
  console.log(`meta_connections: ${connection ? 1 : 0} (status=${connection?.status}, expiresAt=${connection?.expiresAt})`);
  console.log(`meta_ad_accounts: ${adAccount ? 1 : 0} (externalId=${adAccount?.externalId})`);
  console.log(`meta_campaigns: ${campaignCount}`);
  console.log(`meta_adsets: ${adsetCount}`);
  console.log(`meta_ads: ${adCount} (com thumbnail: ${adsWithThumb})`);
  console.log(`meta_insights_daily: ${insightCount}`);

  console.log("\n== EXEMPLO: 1 campanha ==");
  const [campaign] = await db.select().from(metaCampaigns).where(eq(metaCampaigns.clientId, client.id)).limit(1);
  console.log(JSON.stringify(campaign, null, 2));

  console.log("\n== EXEMPLO: 1 anúncio (com thumbnail) ==");
  const [ad] = await db
    .select()
    .from(metaAds)
    .where(sql`${metaAds.clientId} = ${client.id} and ${metaAds.thumbnailUrl} is not null`)
    .limit(1);
  console.log(JSON.stringify(ad, null, 2));

  console.log("\n== EXEMPLO: 1 insight diário ==");
  const [insight] = await db.select().from(metaInsightsDaily).where(eq(metaInsightsDaily.clientId, client.id)).limit(1);
  console.log(JSON.stringify(insight, null, 2));

  console.log("\n== Distribuição de datas do backfill ==");
  const dateRange = await db
    .select({ min: sql<string>`min(${metaInsightsDaily.date})`, max: sql<string>`max(${metaInsightsDaily.date})`, distinctDays: sql<number>`count(distinct ${metaInsightsDaily.date})::int` })
    .from(metaInsightsDaily)
    .where(eq(metaInsightsDaily.clientId, client.id));
  console.log(JSON.stringify(dateRange[0], null, 2));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
