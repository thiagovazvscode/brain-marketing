import { and, desc, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaAdAccounts, metaCampaigns, metaAdsets, metaAds, metaInsightsDaily, metaSyncLogs } from "@/db/schema";
import { resolveReportDateRange, type PeriodInput } from "./period";
import { emptySum, addInto, deriveRatios, percentChange, type AggregatedMetrics } from "./aggregate";
import { pickChampion } from "./champion";
import { buildCampaignDiagnostics, type Diagnostic } from "./diagnostics";

export type ReportFilters = { campaignId?: string; adsetId?: string; adId?: string };

type InsightRow = { entityId: string; date: string; metrics: unknown };
type TrendRow = Record<string, string | number>;

function groupSum(rows: InsightRow[]) {
  const map = new Map<string, ReturnType<typeof emptySum>>();
  for (const row of rows) {
    const sum = map.get(row.entityId) ?? emptySum();
    addInto(sum, row.metrics);
    map.set(row.entityId, sum);
  }
  return map;
}

function trendSeries(rows: InsightRow[], groupKey: (r: InsightRow) => string): TrendRow[] {
  const byDate = new Map<string, TrendRow>();
  for (const row of rows) {
    const key = groupKey(row);
    const entry = byDate.get(row.date) ?? { date: row.date };
    entry[key] = Number((row.metrics as { costPerLead?: number })?.costPerLead) || 0;
    byDate.set(row.date, entry);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, values]) => values);
}

export async function getClientReport(clientSlug: string, period: PeriodInput, filters: ReportFilters) {
  const [client] = await db.select().from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) return { notFound: true as const };

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);
  if (!adAccount) return { notConnected: true as const, client: { slug: client.slug, name: client.name } };

  const [{ min: earliest }] = await db
    .select({ min: sql<string | null>`min(${metaInsightsDaily.date})` })
    .from(metaInsightsDaily)
    .where(eq(metaInsightsDaily.clientId, client.id));

  // "Atualizado em" precisa refletir a última sincronização BEM-SUCEDIDA
  // (não o último fetch de qualquer linha, que não distingue sucesso de
  // falha/parcial) — vem de meta_sync_logs, nunca de metaInsightsDaily.
  const [lastSuccessfulSync] = await db
    .select({ finishedAt: metaSyncLogs.finishedAt })
    .from(metaSyncLogs)
    .where(and(eq(metaSyncLogs.adAccountId, adAccount.id), eq(metaSyncLogs.status, "success")))
    .orderBy(desc(metaSyncLogs.finishedAt))
    .limit(1);
  const lastSync = lastSuccessfulSync?.finishedAt?.toISOString() ?? null;

  // Se a sincronização mais recente (independente do status) falhou, sinaliza
  // pro relatório poder exibir um aviso discreto sem esconder os dados já
  // persistidos (nunca zera/apaga nada em caso de falha).
  const [mostRecentSync] = await db
    .select({ status: metaSyncLogs.status, errorMessage: metaSyncLogs.errorMessage, finishedAt: metaSyncLogs.finishedAt })
    .from(metaSyncLogs)
    .where(and(eq(metaSyncLogs.adAccountId, adAccount.id), sql`${metaSyncLogs.status} != 'running'`))
    .orderBy(desc(metaSyncLogs.startedAt))
    .limit(1);
  const syncWarning = mostRecentSync && mostRecentSync.status === "failed" ? "A última sincronização automática falhou — exibindo os dados mais recentes disponíveis." : null;

  if (!earliest) {
    return { noData: true as const, client: { slug: client.slug, name: client.name }, account: { externalId: adAccount.externalId, name: adAccount.name } };
  }

  // O timezone usado aqui é sempre o da conta de anúncios (Meta), nunca UTC
  // nem o timezone do servidor — ver src/lib/reports/period.ts.
  const range = resolveReportDateRange({
    period: period.preset,
    from: period.from,
    to: period.to,
    timezone: adAccount.timezoneName || "UTC",
    earliestAvailable: earliest,
  });

  const [campaignsMeta, adsetsMeta, adsMeta] = await Promise.all([
    db.select().from(metaCampaigns).where(eq(metaCampaigns.clientId, client.id)),
    db.select().from(metaAdsets).where(eq(metaAdsets.clientId, client.id)),
    db.select().from(metaAds).where(eq(metaAds.clientId, client.id)),
  ]);

  const campaignById = new Map(campaignsMeta.map((c) => [c.id, c]));
  const adsetById = new Map(adsetsMeta.map((a) => [a.id, a]));

  // ── Campanhas (nível campaign, sempre a base pro filtro/diagnóstico) ──
  async function fetchCampaignRows(since: string, until: string) {
    return db
      .select({ entityId: metaInsightsDaily.entityId, date: metaInsightsDaily.date, metrics: metaInsightsDaily.metrics })
      .from(metaInsightsDaily)
      .where(
        and(
          eq(metaInsightsDaily.clientId, client.id),
          eq(metaInsightsDaily.level, "campaign"),
          gte(metaInsightsDaily.date, since),
          lte(metaInsightsDaily.date, until)
        )
      );
  }

  const campaignRows = await fetchCampaignRows(range.since, range.until);
  const campaignSums = groupSum(campaignRows);

  const campaignsAll = campaignsMeta
    .map((c) => {
      const sum = campaignSums.get(c.externalId) ?? emptySum();
      return { id: c.externalId, name: c.name, status: c.status, objective: c.objective, ...deriveRatios(sum) };
    })
    .filter((c) => c.leads > 0 || c.spend > 0 || !filters.campaignId || c.id === filters.campaignId)
    .sort((a, b) => b.leads - a.leads);

  const campaigns = filters.campaignId ? campaignsAll.filter((c) => c.id === filters.campaignId) : campaignsAll;

  const accountAvgCpl = deriveRatios(
    campaignsAll.reduce((acc, c) => {
      addInto(acc, { spend: c.spend, leads: c.leads, impressions: c.impressions, clicks: c.clicks, linkClicks: c.linkClicks, reach: c.reach });
      return acc;
    }, emptySum())
  ).cpl;

  // ── Adsets disponíveis pro filtro (dependente da campanha selecionada) ──
  const adsetsForFilter = adsetsMeta
    .filter((a) => !filters.campaignId || campaignById.get(a.campaignId)?.externalId === filters.campaignId)
    .map((a) => ({ id: a.externalId, name: a.name, status: a.status, campaignId: campaignById.get(a.campaignId)?.externalId ?? null }));

  // ── Anúncios (nível ad), escopo definido pela cadeia campaign→adset→ad ──
  const allowedAds = adsMeta.filter((ad) => {
    const campaignExternal = campaignById.get(ad.campaignId)?.externalId;
    const adsetExternal = adsetById.get(ad.adsetId)?.externalId;
    if (filters.campaignId && campaignExternal !== filters.campaignId) return false;
    if (filters.adsetId && adsetExternal !== filters.adsetId) return false;
    if (filters.adId && ad.externalId !== filters.adId) return false;
    return true;
  });
  const allowedAdExternalIds = allowedAds.map((a) => a.externalId);

  const adRows = allowedAdExternalIds.length
    ? await db
        .select({ entityId: metaInsightsDaily.entityId, date: metaInsightsDaily.date, metrics: metaInsightsDaily.metrics })
        .from(metaInsightsDaily)
        .where(
          and(
            eq(metaInsightsDaily.clientId, client.id),
            eq(metaInsightsDaily.level, "ad"),
            gte(metaInsightsDaily.date, range.since),
            lte(metaInsightsDaily.date, range.until),
            inArray(metaInsightsDaily.entityId, allowedAdExternalIds)
          )
        )
    : [];
  const adSums = groupSum(adRows);

  const ads = allowedAds
    .map((ad) => {
      const sum = adSums.get(ad.externalId) ?? emptySum();
      const campaign = campaignById.get(ad.campaignId);
      const adset = adsetById.get(ad.adsetId);
      return {
        id: ad.externalId,
        name: ad.name,
        status: ad.status,
        mediaType: ad.mediaType,
        thumbnailUrl: ad.thumbnailUrl,
        previewUrl: ad.previewUrl,
        mediaWidth: ad.mediaWidth,
        mediaHeight: ad.mediaHeight,
        campaignId: campaign?.externalId ?? null,
        campaignName: campaign?.name ?? null,
        adsetId: adset?.externalId ?? null,
        ...deriveRatios(sum),
      };
    })
    .filter((a) => a.leads > 0 || a.spend > 0)
    .sort((a, b) => b.leads - a.leads);

  const { champion, lowSample: championLowSample } = pickChampion(ads);

  // ── Summary: depende do nível de filtro mais específico presente ──
  const summarySum = emptySum();
  if (filters.adId) {
    const one = ads.find((a) => a.id === filters.adId);
    if (one) addInto(summarySum, one);
  } else if (filters.adsetId) {
    const adsetRows = await db
      .select({ entityId: metaInsightsDaily.entityId, date: metaInsightsDaily.date, metrics: metaInsightsDaily.metrics })
      .from(metaInsightsDaily)
      .where(
        and(
          eq(metaInsightsDaily.clientId, client.id),
          eq(metaInsightsDaily.level, "adset"),
          eq(metaInsightsDaily.entityId, filters.adsetId),
          gte(metaInsightsDaily.date, range.since),
          lte(metaInsightsDaily.date, range.until)
        )
      );
    for (const row of adsetRows) addInto(summarySum, row.metrics);
  } else {
    for (const c of campaigns) addInto(summarySum, c);
  }
  const summary = deriveRatios(summarySum);

  // ── Comparação com período anterior de mesmo tamanho ──
  let comparison: Record<string, number | null> | null = null;
  if (range.comparisonSince && range.comparisonUntil) {
    const prevCampaignRows = await fetchCampaignRows(range.comparisonSince, range.comparisonUntil);
    const prevSums = groupSum(prevCampaignRows);
    let prevSum = emptySum();
    if (filters.campaignId) {
      const s = prevSums.get(filters.campaignId);
      if (s) prevSum = s;
    } else {
      for (const [, s] of prevSums) addInto(prevSum, s);
    }
    const prev = deriveRatios(prevSum);
    comparison = {
      spend: percentChange(summary.spend, prev.spend),
      leads: percentChange(summary.leads, prev.leads),
      cpl: percentChange(summary.cpl, prev.cpl),
      ctrLink: percentChange(summary.ctrLink, prev.ctrLink),
    };
  }

  // ── Trend (série diária pro gráfico de evolução de CPL) ──
  let trend: TrendRow[] = [];
  if (filters.adId) {
    trend = trendSeries(adRows.filter((r) => r.entityId === filters.adId), () => "CPL");
  } else if (filters.adsetId) {
    const adsetRows = await db
      .select({ entityId: metaInsightsDaily.entityId, date: metaInsightsDaily.date, metrics: metaInsightsDaily.metrics })
      .from(metaInsightsDaily)
      .where(
        and(
          eq(metaInsightsDaily.clientId, client.id),
          eq(metaInsightsDaily.level, "adset"),
          eq(metaInsightsDaily.entityId, filters.adsetId),
          gte(metaInsightsDaily.date, range.since),
          lte(metaInsightsDaily.date, range.until)
        )
      );
    trend = trendSeries(adsetRows, () => "CPL");
  } else if (filters.campaignId) {
    trend = trendSeries(
      campaignRows.filter((r) => r.entityId === filters.campaignId),
      () => "CPL"
    );
  } else {
    const top5 = campaignsAll.slice(0, 5).map((c) => c.id);
    // Nomes de campanha não são únicos (ex.: campanha pausada recriada com o
    // mesmo nome de uma ativa) — sem isso, duas campanhas diferentes
    // colidiriam na mesma série do gráfico. Só desambigua quando há colisão
    // de verdade, pra não poluir o rótulo dos demais casos.
    const nameCounts = new Map<string, number>();
    for (const id of top5) {
      const name = campaignsMeta.find((c) => c.externalId === id)?.name ?? id;
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
    const labelFor = (entityId: string) => {
      const name = campaignsMeta.find((c) => c.externalId === entityId)?.name ?? entityId;
      return (nameCounts.get(name) ?? 0) > 1 ? `${name} (${entityId.slice(-4)})` : name;
    };
    trend = trendSeries(
      campaignRows.filter((r) => top5.includes(r.entityId)),
      (r) => labelFor(r.entityId)
    );
  }

  // ── Diagnóstico determinístico por campanha (respeita filtro de campanha) ──
  const diagnostics: Diagnostic[] = [];
  for (const c of campaigns) {
    const campaignTrend = campaignRows
      .filter((r) => r.entityId === c.id)
      .map((r) => {
        const m = r.metrics as { frequency?: number; ctrLink?: number; costPerLead?: number };
        return { date: r.date, frequency: Number(m.frequency) || 0, ctrLink: Number(m.ctrLink) || 0, cpl: Number(m.costPerLead) || 0 };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    diagnostics.push(...buildCampaignDiagnostics(c, accountAvgCpl, campaignTrend));
  }

  return {
    client: { slug: client.slug, name: client.name },
    account: { externalId: adAccount.externalId, name: adAccount.name, currency: adAccount.currency, timezone: adAccount.timezoneName },
    period: { ...range, preset: period.preset },
    lastSync,
    syncWarning,
    summary,
    comparison,
    campaigns,
    allCampaigns: campaignsAll.map((c) => ({ id: c.id, name: c.name, status: c.status })),
    adsets: adsetsForFilter,
    ads,
    trend,
    championAdId: champion?.id ?? null,
    championLowSample,
    diagnostics,
  };
}

export type ReportContract = Awaited<ReturnType<typeof getClientReport>>;
export type { AggregatedMetrics };

export type AdTrendPoint = { date: string; spend: number; leads: number; cpl: number; ctrLink: number };

/**
 * Série diária de UM anúncio específico (level="ad", entity_id=adId) — nunca
 * dados da campanha inteira. Usa o mesmo período/timezone do relatório
 * principal, então o detalhe do anúncio sempre reflete o contexto de filtro
 * ativo, nunca um "lifetime" escondido. Dias sem linha persistida = sem
 * entrega naquele dia (a própria Meta não retorna linha pra dia sem
 * atividade) — nunca preenchido/interpolado artificialmente.
 */
export async function getAdDailyTrend(clientSlug: string, adId: string, period: PeriodInput): Promise<AdTrendPoint[] | null> {
  const [client] = await db.select().from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) return null;

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);
  if (!adAccount) return null;

  const [{ min: earliest }] = await db
    .select({ min: sql<string | null>`min(${metaInsightsDaily.date})` })
    .from(metaInsightsDaily)
    .where(eq(metaInsightsDaily.clientId, client.id));
  if (!earliest) return [];

  const range = resolveReportDateRange({
    period: period.preset,
    from: period.from,
    to: period.to,
    timezone: adAccount.timezoneName || "UTC",
    earliestAvailable: earliest,
  });

  const rows = await db
    .select({ date: metaInsightsDaily.date, metrics: metaInsightsDaily.metrics })
    .from(metaInsightsDaily)
    .where(
      and(
        eq(metaInsightsDaily.clientId, client.id),
        eq(metaInsightsDaily.level, "ad"),
        eq(metaInsightsDaily.entityId, adId),
        gte(metaInsightsDaily.date, range.since),
        lte(metaInsightsDaily.date, range.until)
      )
    )
    .orderBy(metaInsightsDaily.date);

  return rows.map((r) => {
    const m = r.metrics as { spend?: number; leads?: number; costPerLead?: number; ctrLink?: number };
    return { date: r.date, spend: Number(m.spend) || 0, leads: Number(m.leads) || 0, cpl: Number(m.costPerLead) || 0, ctrLink: Number(m.ctrLink) || 0 };
  });
}
