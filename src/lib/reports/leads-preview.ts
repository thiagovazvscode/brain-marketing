import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaAdAccounts, metaCampaigns, metaInsightsDaily } from "@/db/schema";
import { resolveReportDateRange, type PeriodInput } from "./period";

export type CampaignLeadsPreview = { id: string; name: string; leads: number };
export type LeadsPreviewResult = { since: string; until: string; perCampaign: CampaignLeadsPreview[]; totalLeads: number };

/**
 * Prévia de "quantos leads existem" pro seletor de exportação — soma
 * agregada de Insights (mesma fonte do dashboard), NUNCA a contagem de
 * registros individuais (essa é outra coisa, ver src/lib/leads/source.ts).
 * Serve só pra mostrar "N leads encontrados" antes de exportar, não é o
 * dado que vai pro arquivo.
 *
 * Resolve o período (presets Hoje/Ontem/7/15/30 dias/Personalizado) sempre
 * pela MESMA função central já homologada do dashboard
 * (resolveReportDateRange), usando o timezone real da conta Meta — nunca
 * recebe since/until já calculado do chamador, pra não existir uma segunda
 * lógica de datas por trás (item 4 do pedido).
 */
export async function getCampaignLeadsPreview(
  clientSlug: string,
  campaignIds: string[],
  period: PeriodInput
): Promise<LeadsPreviewResult | null> {
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) return null;

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);
  if (!adAccount) return null;

  const [{ min: earliest }] = await db
    .select({ min: sql<string | null>`min(${metaInsightsDaily.date})` })
    .from(metaInsightsDaily)
    .where(eq(metaInsightsDaily.clientId, client.id));
  if (!earliest) return { since: "", until: "", perCampaign: [], totalLeads: 0 };

  const range = resolveReportDateRange({
    period: period.preset,
    from: period.from,
    to: period.to,
    timezone: adAccount.timezoneName || "UTC",
    earliestAvailable: earliest,
  });

  if (campaignIds.length === 0) return { since: range.since, until: range.until, perCampaign: [], totalLeads: 0 };

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
        gte(metaInsightsDaily.date, range.since),
        lte(metaInsightsDaily.date, range.until)
      )
    );

  const sums = new Map<string, number>();
  for (const r of rows) {
    const leads = Number((r.metrics as { leads?: number })?.leads) || 0;
    sums.set(r.entityId, (sums.get(r.entityId) ?? 0) + leads);
  }

  const perCampaign = campaignsMeta.map((c) => ({ id: c.externalId, name: c.name, leads: sums.get(c.externalId) ?? 0 }));
  const totalLeads = perCampaign.reduce((s, c) => s + c.leads, 0);
  return { since: range.since, until: range.until, perCampaign, totalLeads };
}
