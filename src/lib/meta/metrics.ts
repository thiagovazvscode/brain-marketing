import type { GraphInsightRow } from "./graph-client";

/**
 * Mapeamento EXATO de campo Meta → métrica da UI. Nenhuma métrica aqui é
 * inventada — cada uma vem de um campo real da Insights API ou é derivada
 * por uma fórmula documentada.
 *
 *   spend        ← `spend`
 *   impressions  ← `impressions`
 *   reach        ← `reach`
 *   frequency    ← `frequency`
 *   clicks       ← `clicks` (todo clique, não só de link)
 *   linkClicks   ← `inline_link_clicks`
 *   ctr          ← `ctr` (retornado pronto pela Meta)
 *   ctrLink      ← `inline_link_click_ctr`
 *   cpc          ← `cpc`
 *   cpm          ← `cpm`
 *   leads        ← extractLeadCount(actions) — ver função abaixo
 *   costPerLead  ← extractLeadCost(cost_per_action_type), com fallback pra
 *                  spend/leads quando a Meta não retorna esse action_type
 *
 * IMPORTANTE sobre leads (verificado com dados reais da conta MV Imóveis em
 * 2026-08-12, via act_1294043869320088): o array `actions` do Meta retorna
 * VÁRIOS action_types pro mesmo evento de lead — em toda campanha
 * OUTCOME_LEADS testada, `lead` e `onsite_conversion.lead_grouped` vieram
 * com o MESMO valor (ex.: 16 e 16, 155 e 155, 62 e 62). São a mesma contagem
 * relatada de duas formas, não dois eventos — SOMAR os dois duplicaria o
 * número de leads. A extração correta é pegar o PRIMEIRO action_type
 * encontrado numa ordem de prioridade, nunca somar todos os candidatos.
 */

// Ordem de prioridade — o primeiro action_type presente no array `actions`
// é usado como contagem de leads; os demais são ignorados (são a mesma
// contagem sob outro nome, não eventos adicionais).
export const LEAD_ACTION_TYPES = [
  "onsite_conversion.lead_grouped", // grouping recomendado pela Meta pra objetivo de Leads
  "lead",
  "onsite_conversion.lead",
  "leadgen_grouped",
  "onsite_conversion.leadgen_grouped",
  "offsite_conversion.fb_pixel_lead", // conversão via Pixel, campanhas fora do formulário nativo
];

function numberFrom(value?: string) {
  return Number.parseFloat(value || "0") || 0;
}

/**
 * Retorna o valor do PRIMEIRO action_type de LEAD_ACTION_TYPES presente em
 * `actions` — nunca soma múltiplos action_types (ver nota acima sobre
 * duplicidade).
 */
export function extractLeadCount(actions: { action_type: string; value: string }[] | undefined): number {
  if (!actions?.length) return 0;
  for (const type of LEAD_ACTION_TYPES) {
    const row = actions.find((a) => a.action_type === type);
    if (row) return Number(row.value) || 0;
  }
  return 0;
}

/**
 * Mesmo princípio para custo por lead: primeiro action_type encontrado em
 * cost_per_action_type, nunca uma soma/média entre candidatos.
 */
export function extractLeadCost(costs: { action_type: string; value: string }[] | undefined): number {
  if (!costs?.length) return 0;
  for (const type of LEAD_ACTION_TYPES) {
    const row = costs.find((c) => c.action_type === type);
    if (row) return Number(row.value) || 0;
  }
  return 0;
}

export type DailyMetrics = {
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  ctrLink: number;
  cpc: number;
  cpm: number;
  leads: number;
  costPerLead: number;
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
};

export function buildDailyMetrics(row: GraphInsightRow): DailyMetrics {
  const spend = numberFrom(row.spend);
  const leads = extractLeadCount(row.actions);
  const costPerLeadFromMeta = extractLeadCost(row.cost_per_action_type);

  return {
    spend,
    impressions: Math.trunc(numberFrom(row.impressions)),
    reach: Math.trunc(numberFrom(row.reach)),
    frequency: Number(numberFrom(row.frequency).toFixed(2)),
    clicks: Math.trunc(numberFrom(row.clicks)),
    linkClicks: Math.trunc(numberFrom(row.inline_link_clicks)),
    ctr: Number(numberFrom(row.ctr).toFixed(2)),
    ctrLink: Number(numberFrom(row.inline_link_click_ctr).toFixed(2)),
    cpc: Number(numberFrom(row.cpc).toFixed(2)),
    cpm: Number(numberFrom(row.cpm).toFixed(2)),
    leads,
    costPerLead: Number((costPerLeadFromMeta || (leads > 0 ? spend / leads : 0)).toFixed(2)),
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adsetId: row.adset_id,
    adsetName: row.adset_name,
    adId: row.ad_id,
    adName: row.ad_name,
  };
}
