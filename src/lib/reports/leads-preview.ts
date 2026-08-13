import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaAdAccounts, metaCampaigns, metaInsightsDaily, metaLeads } from "@/db/schema";
import { resolveReportDateRange, type PeriodInput } from "./period";

export type CampaignLeadsPreview = { id: string; name: string; leads: number };
export type LeadsPreviewResult = { since: string; until: string; perCampaign: CampaignLeadsPreview[]; totalLeads: number };

/**
 * Prévia de "quantos REGISTROS INDIVIDUAIS existem" pro seletor de
 * exportação — conta linhas reais de meta_leads (a mesma fonte que vai pro
 * arquivo em src/lib/leads/source.ts), nunca o agregado de Insights. "N
 * leads encontrados" aqui sempre corresponde 1:1 ao que vai sair no
 * XLSX/CSV — nunca um número que a exportação depois não consegue entregar.
 *
 * Período (presets Hoje/Ontem/7/15/30 dias/Personalizado) continua resolvido
 * pela MESMA função central já homologada do dashboard
 * (resolveReportDateRange), usando o timezone real da conta Meta — só a
 * CONTAGEM mudou de fonte, a resolução de datas não (item 4 do pedido de
 * ajuste de período).
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
    .select({ campaignId: metaLeads.campaignId, count: sql<number>`count(*)::int` })
    .from(metaLeads)
    .where(
      and(
        eq(metaLeads.clientId, client.id),
        inArray(metaLeads.campaignId, campaignIds),
        gte(metaLeads.leadDateLocal, range.since),
        lte(metaLeads.leadDateLocal, range.until)
      )
    )
    .groupBy(metaLeads.campaignId);

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.campaignId) counts.set(r.campaignId, r.count);
  }

  const perCampaign = campaignsMeta.map((c) => ({ id: c.externalId, name: c.name, leads: counts.get(c.externalId) ?? 0 }));
  const totalLeads = perCampaign.reduce((s, c) => s + c.leads, 0);
  return { since: range.since, until: range.until, perCampaign, totalLeads };
}
