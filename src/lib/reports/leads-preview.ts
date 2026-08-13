import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaCampaigns, metaInsightsDaily } from "@/db/schema";

export type CampaignLeadsPreview = { id: string; name: string; leads: number };

/**
 * Prévia de "quantos leads existem" pro seletor de exportação — soma
 * agregada de Insights (mesma fonte do dashboard), NUNCA a contagem de
 * registros individuais (essa é outra coisa, ver src/lib/leads/source.ts).
 * Serve só pra mostrar "N leads encontrados" antes de exportar, não é o
 * dado que vai pro arquivo.
 */
export async function getCampaignLeadsPreview(
  clientSlug: string,
  campaignIds: string[],
  since: string,
  until: string
): Promise<{ perCampaign: CampaignLeadsPreview[]; totalLeads: number } | null> {
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) return null;
  if (campaignIds.length === 0) return { perCampaign: [], totalLeads: 0 };

  const campaignsMeta = await db
    .select({ externalId: metaCampaigns.externalId, name: metaCampaigns.name })
    .from(metaCampaigns)
    .where(and(eq(metaCampaigns.clientId, client.id), inArray(metaCampaigns.externalId, campaignIds)));

  const rows = await db
    .select({ entityId: metaInsightsDaily.entityId, metrics: metaInsightsDaily.metrics })
    .from(metaInsightsDaily)
    .where(
      and(
        eq(metaInsightsDaily.clientId, client.id),
        eq(metaInsightsDaily.level, "campaign"),
        inArray(metaInsightsDaily.entityId, campaignIds),
        gte(metaInsightsDaily.date, since),
        lte(metaInsightsDaily.date, until)
      )
    );

  const sums = new Map<string, number>();
  for (const r of rows) {
    const leads = Number((r.metrics as { leads?: number })?.leads) || 0;
    sums.set(r.entityId, (sums.get(r.entityId) ?? 0) + leads);
  }

  const perCampaign = campaignsMeta.map((c) => ({ id: c.externalId, name: c.name, leads: sums.get(c.externalId) ?? 0 }));
  const totalLeads = perCampaign.reduce((s, c) => s + c.leads, 0);
  return { perCampaign, totalLeads };
}
