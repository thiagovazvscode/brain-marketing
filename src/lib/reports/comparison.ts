import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaAdAccounts, metaCampaigns, metaInsightsDaily } from "@/db/schema";
import { resolveReportDateRange, type PeriodInput } from "./period";
import { emptySum, addInto, deriveRatios, percentChange, type AggregatedMetrics } from "./aggregate";

export type CompareTrendPoint = { date: string; leads: number; cpl: number; spend: number; ctrLink: number };

export type CampaignCompareEntry = {
  id: string;
  name: string;
  status: string | null;
  activeDays: number;
  metrics: AggregatedMetrics;
  leadsPerActiveDay: number;
  spendPerActiveDay: number;
  trend: CompareTrendPoint[];
};

export type ComparisonDiff = {
  key: string;
  label: string;
  a: number;
  b: number;
  format: "currency" | "integer" | "percent" | "decimal";
  // percentChange de B em relação a A — null quando não há base pra comparar
  diffPct: number | null;
};

export type ComparisonResult = {
  client: { slug: string; name: string };
  account: { externalId: string; name: string; currency: string | null; timezone: string | null };
  period: { since: string; until: string };
  a: CampaignCompareEntry;
  b: CampaignCompareEntry;
  diffs: ComparisonDiff[];
  diagnostics: string[];
};

export type CompareNotFound = { notFound: true };
export type CompareInvalid = { invalid: true; message: string };

function buildEntry(
  campaign: { externalId: string; name: string; status: string | null },
  rows: { entityId: string; date: string; metrics: unknown }[]
): CampaignCompareEntry {
  const own = rows.filter((r) => r.entityId === campaign.externalId);
  const sum = emptySum();
  for (const r of own) addInto(sum, r.metrics);
  const metrics = deriveRatios(sum);
  const activeDays = own.length; // 1 linha persistida = 1 dia com entrega real (nunca interpolado)

  const trend: CompareTrendPoint[] = own
    .map((r) => {
      const m = r.metrics as { leads?: number; costPerLead?: number; spend?: number; ctrLink?: number };
      return {
        date: r.date,
        leads: Number(m.leads) || 0,
        cpl: Number(m.costPerLead) || 0,
        spend: Number(m.spend) || 0,
        ctrLink: Number(m.ctrLink) || 0,
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date));

  return {
    id: campaign.externalId,
    name: campaign.name,
    status: campaign.status,
    activeDays,
    metrics,
    leadsPerActiveDay: activeDays > 0 ? Number((metrics.leads / activeDays).toFixed(2)) : 0,
    spendPerActiveDay: activeDays > 0 ? Number((metrics.spend / activeDays).toFixed(2)) : 0,
    trend,
  };
}

function buildDiffs(a: CampaignCompareEntry, b: CampaignCompareEntry): ComparisonDiff[] {
  const rows: ComparisonDiff[] = [
    { key: "spend", label: "Investimento", a: a.metrics.spend, b: b.metrics.spend, format: "currency", diffPct: percentChange(b.metrics.spend, a.metrics.spend) },
    { key: "leads", label: "Leads", a: a.metrics.leads, b: b.metrics.leads, format: "integer", diffPct: percentChange(b.metrics.leads, a.metrics.leads) },
    { key: "cpl", label: "CPL", a: a.metrics.cpl, b: b.metrics.cpl, format: "currency", diffPct: percentChange(b.metrics.cpl, a.metrics.cpl) },
    { key: "ctrLink", label: "CTR Link", a: a.metrics.ctrLink, b: b.metrics.ctrLink, format: "percent", diffPct: percentChange(b.metrics.ctrLink, a.metrics.ctrLink) },
    { key: "cpm", label: "CPM", a: a.metrics.cpm, b: b.metrics.cpm, format: "currency", diffPct: percentChange(b.metrics.cpm, a.metrics.cpm) },
    { key: "reach", label: "Alcance", a: a.metrics.reach, b: b.metrics.reach, format: "integer", diffPct: percentChange(b.metrics.reach, a.metrics.reach) },
    { key: "impressions", label: "Impressões", a: a.metrics.impressions, b: b.metrics.impressions, format: "integer", diffPct: percentChange(b.metrics.impressions, a.metrics.impressions) },
    { key: "frequency", label: "Frequência", a: a.metrics.frequency, b: b.metrics.frequency, format: "decimal", diffPct: percentChange(b.metrics.frequency, a.metrics.frequency) },
    { key: "linkClicks", label: "Cliques no link", a: a.metrics.linkClicks, b: b.metrics.linkClicks, format: "integer", diffPct: percentChange(b.metrics.linkClicks, a.metrics.linkClicks) },
    { key: "leadsPerActiveDay", label: "Leads/dia ativo", a: a.leadsPerActiveDay, b: b.leadsPerActiveDay, format: "decimal", diffPct: percentChange(b.leadsPerActiveDay, a.leadsPerActiveDay) },
    { key: "spendPerActiveDay", label: "Investimento/dia ativo", a: a.spendPerActiveDay, b: b.spendPerActiveDay, format: "currency", diffPct: percentChange(b.spendPerActiveDay, a.spendPerActiveDay) },
  ];
  return rows;
}

/**
 * Diagnóstico comparativo determinístico — nada de texto gerado por IA.
 * Cada regra só dispara quando há base numérica real pra sustentar a frase
 * (evita "X% superior" sobre 0/0), e reconhece trade-off em vez de declarar
 * um vencedor único. Frequência de propósito NÃO gera frase de veredito —
 * é dado de contexto, não sinal automático de melhor/pior.
 */
function buildComparativeDiagnostics(a: CampaignCompareEntry, b: CampaignCompareEntry): string[] {
  const out: string[] = [];

  if (a.metrics.leads > 0 && b.metrics.leads > 0 && a.metrics.cpl > 0 && b.metrics.cpl > 0) {
    const [lower, higher] = a.metrics.cpl <= b.metrics.cpl ? [a, b] : [b, a];
    const diff = percentChange(higher.metrics.cpl, lower.metrics.cpl);
    if (diff !== null && diff !== 0) {
      out.push(`${lower.name} apresentou CPL ${Math.abs(diff).toFixed(1)}% inferior à ${higher.name} no período.`);
    }
  }

  if (a.metrics.leads !== b.metrics.leads) {
    const [less, more] = a.metrics.leads <= b.metrics.leads ? [a, b] : [b, a];
    const diff = percentChange(more.metrics.leads, less.metrics.leads);
    if (diff !== null && more.metrics.leads > 0) {
      out.push(`${more.name} gerou ${diff.toFixed(1)}% mais leads absolutos que ${less.name}.`);
    }
  }

  if (a.activeDays > 0 && b.activeDays > 0 && (a.activeDays !== b.activeDays || a.leadsPerActiveDay !== b.leadsPerActiveDay)) {
    out.push(
      `Considerando dias ativos, ${a.name} gerou ${a.leadsPerActiveDay.toFixed(2)} lead${a.leadsPerActiveDay === 1 ? "" : "s"}/dia (${a.activeDays} dia${a.activeDays === 1 ? "" : "s"} ativo${a.activeDays === 1 ? "" : "s"}) contra ${b.leadsPerActiveDay.toFixed(2)}/dia de ${b.name} (${b.activeDays} dia${b.activeDays === 1 ? "" : "s"} ativo${b.activeDays === 1 ? "" : "s"}).`
    );
  }

  if (a.metrics.ctrLink > 0 && b.metrics.ctrLink > 0 && a.metrics.ctrLink !== b.metrics.ctrLink) {
    const [lower, higher] = a.metrics.ctrLink <= b.metrics.ctrLink ? [a, b] : [b, a];
    const diff = percentChange(higher.metrics.ctrLink, lower.metrics.ctrLink);
    if (diff !== null) {
      out.push(`${higher.name} apresentou CTR de link ${Math.abs(diff).toFixed(1)}% superior à ${lower.name}.`);
    }
  }

  if (out.length === 0) {
    out.push("Dados insuficientes no período selecionado para um diagnóstico comparativo confiável.");
  }

  return out;
}

export async function getCampaignComparison(
  clientSlug: string,
  period: PeriodInput,
  campaignIdA: string,
  campaignIdB: string
): Promise<ComparisonResult | CompareNotFound | CompareInvalid> {
  if (campaignIdA === campaignIdB) {
    return { invalid: true, message: "Selecione duas campanhas diferentes para comparar." };
  }

  const [client] = await db.select().from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) return { notFound: true };

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);
  if (!adAccount) return { notFound: true };

  const campaignsMeta = await db
    .select()
    .from(metaCampaigns)
    .where(and(eq(metaCampaigns.clientId, client.id), inArray(metaCampaigns.externalId, [campaignIdA, campaignIdB])));

  const campaignA = campaignsMeta.find((c) => c.externalId === campaignIdA);
  const campaignB = campaignsMeta.find((c) => c.externalId === campaignIdB);
  if (!campaignA || !campaignB) return { notFound: true };

  const earliest = await db
    .select({ date: metaInsightsDaily.date })
    .from(metaInsightsDaily)
    .where(eq(metaInsightsDaily.clientId, client.id))
    .orderBy(metaInsightsDaily.date)
    .limit(1);
  const earliestAvailable = earliest[0]?.date ?? period.from ?? "2020-01-01";

  const range = resolveReportDateRange({
    period: period.preset,
    from: period.from,
    to: period.to,
    timezone: adAccount.timezoneName || "UTC",
    earliestAvailable,
  });

  const rows = await db
    .select({ entityId: metaInsightsDaily.entityId, date: metaInsightsDaily.date, metrics: metaInsightsDaily.metrics })
    .from(metaInsightsDaily)
    .where(
      and(
        eq(metaInsightsDaily.clientId, client.id),
        eq(metaInsightsDaily.level, "campaign"),
        inArray(metaInsightsDaily.entityId, [campaignIdA, campaignIdB]),
        gte(metaInsightsDaily.date, range.since),
        lte(metaInsightsDaily.date, range.until)
      )
    );

  const a = buildEntry(campaignA, rows);
  const b = buildEntry(campaignB, rows);

  return {
    client: { slug: client.slug, name: client.name },
    account: { externalId: adAccount.externalId, name: adAccount.name, currency: adAccount.currency, timezone: adAccount.timezoneName },
    period: { since: range.since, until: range.until },
    a,
    b,
    diffs: buildDiffs(a, b),
    diagnostics: buildComparativeDiagnostics(a, b),
  };
}
