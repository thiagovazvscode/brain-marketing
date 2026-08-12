/**
 * Soma métricas diárias persistidas (meta_insights_daily.metrics) num total
 * de período, e deriva as razões (CTR/CPM/CPC/CPL/frequência) a partir dos
 * totais somados — nunca fazendo média das razões diárias (isso distorce o
 * resultado). Mesma lógica documentada em src/lib/meta/metrics.ts.
 *
 * Ressalva conhecida: `reach` é a soma do reach diário, não o reach único do
 * período (a mesma pessoa alcançada em dois dias conta duas vezes) — o Meta
 * só entrega reach único de período numa chamada agregada própria, que não
 * fazemos aqui porque a base é o histórico já persistido. `frequency`
 * derivada disso herda a mesma aproximação.
 */

export type RawDailyMetrics = {
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  linkClicks?: number;
  leads?: number;
};

export type AggregatedMetrics = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  leads: number;
  ctr: number;
  ctrLink: number;
  cpc: number;
  cpm: number;
  cpl: number;
  frequency: number;
};

export function emptySum() {
  return { spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, leads: 0 };
}

export function addInto(sum: ReturnType<typeof emptySum>, m: unknown) {
  const metrics = (m ?? {}) as RawDailyMetrics;
  sum.spend += Number(metrics.spend) || 0;
  sum.impressions += Number(metrics.impressions) || 0;
  sum.reach += Number(metrics.reach) || 0;
  sum.clicks += Number(metrics.clicks) || 0;
  sum.linkClicks += Number(metrics.linkClicks) || 0;
  sum.leads += Number(metrics.leads) || 0;
}

export function deriveRatios(sum: ReturnType<typeof emptySum>): AggregatedMetrics {
  const { spend, impressions, reach, clicks, linkClicks, leads } = sum;
  return {
    spend: Number(spend.toFixed(2)),
    impressions,
    reach,
    clicks,
    linkClicks,
    leads,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    ctrLink: impressions > 0 ? Number(((linkClicks / impressions) * 100).toFixed(2)) : 0,
    cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    cpl: leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
    frequency: reach > 0 ? Number((impressions / reach).toFixed(2)) : 0,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // "null" = sem base pra comparar (evita mostrar infinito/enganoso)
  return Number((((current - previous) / previous) * 100).toFixed(1));
}
