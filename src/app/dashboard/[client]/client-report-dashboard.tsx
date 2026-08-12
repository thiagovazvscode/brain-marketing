"use client";

/**
 * Dashboard de performance (Facebook Ads) — dados reais, persistidos pela
 * própria Brain (Neon/Drizzle), sincronizados da Meta Marketing API.
 * Genérico: qualquer cliente com integração Meta conectada funciona aqui
 * sem mudar este arquivo — basta existir em `clients` + `meta_connections`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const PALETTE = ["#2a78d6", "#eb6834", "#16a34a", "#a855f7", "#eab308", "#ec4899", "#06b6d4", "#f97316"];

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
  { value: "since_start", label: "Desde o início" },
  { value: "custom", label: "Personalizado" },
];

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ACTIVE: { label: "Ativa", bg: "#0ca30c1a", text: "#4ade80", dot: "#22c55e" },
  PAUSED: { label: "Pausada", bg: "#fab2191a", text: "#fbbf24", dot: "#f59e0b" },
  DELETED: { label: "Excluída", bg: "#ef44441a", text: "#f87171", dot: "#ef4444" },
  ARCHIVED: { label: "Arquivada", bg: "#71717a1a", text: "#a1a1aa", dot: "#71717a" },
};

type Metrics = {
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

type Campaign = Metrics & { id: string; name: string; status: string | null; objective: string | null };
type Ad = Metrics & {
  id: string;
  name: string;
  status: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
};
type Adset = { id: string; name: string; status: string | null; campaignId: string | null };
type Diagnostic = { type: "positive" | "warning" | "info"; message: string };

type ReportData = {
  client: { slug: string; name: string };
  account: { externalId: string; name: string; currency: string | null; timezone: string | null };
  period: { since: string; until: string; clampedToEarliest: boolean; earliestAvailable: string };
  lastSync: string | null;
  syncWarning: string | null;
  summary: Metrics;
  comparison: Record<string, number | null> | null;
  campaigns: Campaign[];
  allCampaigns: { id: string; name: string; status: string | null }[];
  adsets: Adset[];
  ads: Ad[];
  trend: Record<string, string | number>[];
  championAdId: string | null;
  championLowSample: boolean;
  diagnostics: Diagnostic[];
};

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function integer(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}
function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
function shortDate(value: string) {
  const parts = String(value).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : String(value);
}

function DeltaBadge({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined) return null;
  const positive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  const color = neutral ? "#a1a1aa" : positive ? "#4ade80" : "#f87171";
  const arrow = neutral ? "•" : value > 0 ? "↑" : "↓";
  return (
    <span className="ml-1.5 text-xs font-semibold" style={{ color }}>
      {arrow} {Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />;
}

function StatusBadge({ status }: { status: string | null }) {
  const c = STATUS_LABEL[status || ""] || STATUS_LABEL.ARCHIVED;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

function AdThumb({ ad, size = "normal" }: { ad: Ad; size?: "normal" | "large" }) {
  const cls = size === "large" ? "aspect-[9/16] w-full max-w-[280px]" : "aspect-[9/16] w-full";
  if (!ad.thumbnailUrl) {
    return (
      <div className={`${cls} flex items-center justify-center rounded-xl border border-white/10 bg-black/40 text-center text-[11px] text-zinc-500`}>
        Prévia indisponível
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ad.thumbnailUrl} alt={ad.name} className={`${cls} rounded-xl border border-white/10 object-cover`} />
  );
}

const AD_TABS = ["destaques", "leads", "cpl", "ctr", "atencao"] as const;
type AdTab = (typeof AD_TABS)[number];
const AD_TAB_LABEL: Record<AdTab, string> = {
  destaques: "Destaques",
  leads: "Mais leads",
  cpl: "Menor CPL",
  ctr: "Melhor CTR",
  atencao: "Atenção",
};

export function ClientReportDashboard({ client, displayName }: { client: string; displayName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [period, setPeriod] = useState(searchParams.get("period") || "last_30d");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") || "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") || "");
  const [campaignId, setCampaignId] = useState(searchParams.get("campaign") || "all");
  const [adsetId, setAdsetId] = useState(searchParams.get("adset") || "all");
  const [adId, setAdId] = useState(searchParams.get("ad") || "all");
  const [adTab, setAdTab] = useState<AdTab>("destaques");
  const [detailAd, setDetailAd] = useState<Ad | null>(null);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dateError = period === "custom" && customFrom && customTo && customFrom > customTo;
  const canFetch = period !== "custom" || (customFrom && customTo && !dateError);

  const updateUrl = useCallback(
    (next: { period: string; campaign: string; adset: string; ad: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      qs.set("period", next.period);
      if (next.campaign !== "all") qs.set("campaign", next.campaign);
      if (next.adset !== "all") qs.set("adset", next.adset);
      if (next.ad !== "all") qs.set("ad", next.ad);
      if (next.period === "custom") {
        if (next.from) qs.set("from", next.from);
        if (next.to) qs.set("to", next.to);
      }
      router.replace(`/dashboard/${client}?${qs.toString()}`, { scroll: false });
    },
    [router, client]
  );

  useEffect(() => {
    if (!canFetch) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function run() {
      setLoading(true);
      setErrorMsg(null);

      const qs = new URLSearchParams();
      qs.set("period", period);
      if (period === "custom") {
        qs.set("from", customFrom);
        qs.set("to", customTo);
      }
      if (campaignId !== "all") qs.set("campaignId", campaignId);
      if (adsetId !== "all") qs.set("adsetId", adsetId);
      if (adId !== "all") qs.set("adId", adId);

      try {
        const res = await fetch(`/api/reports/${client}?${qs.toString()}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erro HTTP ${res.status}`);
        setData(json as ReportData);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar relatório.");
      } finally {
        setLoading(false);
      }
    }

    run();
    updateUrl({ period, campaign: campaignId, adset: adsetId, ad: adId, from: customFrom, to: customTo });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo, campaignId, adsetId, adId, client, canFetch]);

  // Trocar campanha reseta conjunto/anúncio (dependência em cascata)
  const handleCampaignChange = (value: string) => {
    setCampaignId(value);
    setAdsetId("all");
    setAdId("all");
  };
  const handleAdsetChange = (value: string) => {
    setAdsetId(value);
    setAdId("all");
  };

  const campaigns = useMemo(() => data?.campaigns ?? [], [data]);
  const allCampaigns = useMemo(() => data?.allCampaigns ?? [], [data]);
  const adsets = useMemo(() => data?.adsets ?? [], [data]);
  const ads = useMemo(() => data?.ads ?? [], [data]);
  const diagnostics = useMemo(() => data?.diagnostics ?? [], [data]);

  const campaignColor = useMemo(() => {
    const map = new Map<string, string>();
    allCampaigns.forEach((c, i) => map.set(c.id, PALETTE[i % PALETTE.length]));
    return map;
  }, [allCampaigns]);

  const leadsByCampaignChart = useMemo(() => {
    const sorted = [...campaigns].filter((c) => c.leads > 0).sort((a, b) => b.leads - a.leads);
    const TOP_N = 8;
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    // id próprio pra cada barra — nomes de campanha podem se repetir (ex.:
    // uma campanha pausada recriada com o mesmo nome de outra ativa), então
    // `name` sozinho não é chave estável nem única.
    const bars = top.map((c) => ({ id: c.id, name: c.name, leads: c.leads, fill: campaignColor.get(c.id) || PALETTE[0] }));
    if (rest.length > 0) {
      bars.push({ id: "__outras__", name: `Outras (${rest.length})`, leads: rest.reduce((s, c) => s + c.leads, 0), fill: "#52525b" });
    }
    return bars;
  }, [campaigns, campaignColor]);

  const trendSeriesKeys = useMemo(() => {
    if (!data?.trend?.length) return [];
    const keys = new Set<string>();
    data.trend.forEach((row) => Object.keys(row).forEach((k) => k !== "date" && keys.add(k)));
    return Array.from(keys);
  }, [data]);

  const trendChart = useMemo(
    () => (data?.trend ?? []).map((row) => ({ ...row, date: shortDate(String(row.date)) })),
    [data]
  );

  const adsForTab = useMemo(() => {
    const withResult = ads.filter((a) => a.leads > 0 || a.spend > 0);
    switch (adTab) {
      case "leads":
      case "destaques":
        return [...withResult].sort((a, b) => b.leads - a.leads);
      case "cpl":
        return [...withResult].filter((a) => a.leads > 0).sort((a, b) => a.cpl - b.cpl);
      case "ctr":
        return [...withResult].sort((a, b) => b.ctrLink - a.ctrLink);
      case "atencao":
        return withResult.filter((a) => a.leads === 0 && a.spend > 20).sort((a, b) => b.spend - a.spend);
      default:
        return withResult;
    }
  }, [ads, adTab]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-5">
          <div>
            <Link href="/" className="text-sm font-bold tracking-tight text-white hover:text-emerald-400">
              BRAIN Marketing & Performance
            </Link>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Relatório de performance · Facebook Ads
            </p>
            <h1 className="mt-1 text-xl font-bold">{displayName}</h1>
            {data?.account ? <p className="mt-0.5 text-xs text-zinc-500">{data.account.name}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            {data ? (
              <div className="text-right text-xs text-zinc-500">
                Atualizado em{" "}
                <span className="font-semibold text-zinc-300">
                  {data.lastSync ? new Date(data.lastSync).toLocaleString("pt-BR") : "—"}
                </span>
                <br />
                Dados até <span className="font-semibold text-zinc-300">{data.period.until}</span>
              </div>
            ) : null}
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5">
              Voltar ao site
            </Link>
          </div>
        </header>

        {data?.syncWarning ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
            {data.syncWarning}
          </div>
        ) : null}

        {/* Filtros */}
        <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-4">
          <FilterSelect label="Período" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />

          {period === "custom" ? (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white" />
              <span className="text-xs text-zinc-500">até</span>
              <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white" />
              {dateError ? <span className="text-xs text-red-400">data final antes da inicial</span> : null}
            </div>
          ) : null}

          <FilterSelect
            label="Campanha"
            value={campaignId}
            onChange={handleCampaignChange}
            options={[{ value: "all", label: "Todas as campanhas" }, ...allCampaigns.map((c) => ({ value: c.id, label: c.name }))]}
          />

          <FilterSelect
            label="Conjunto"
            value={adsetId}
            onChange={handleAdsetChange}
            options={[{ value: "all", label: campaignId === "all" ? "Todos os conjuntos" : "Todos da campanha" }, ...adsets.map((a) => ({ value: a.id, label: a.name }))]}
          />

          <FilterSelect
            label="Anúncio"
            value={adId}
            onChange={setAdId}
            options={[{ value: "all", label: "Todos os anúncios" }, ...ads.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </section>

        {data?.period.clampedToEarliest ? (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            Dados disponíveis a partir de {data.period.earliestAvailable}. Ajustamos o período pra esse intervalo.
          </div>
        ) : null}

        {errorMsg ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{errorMsg}</div>
        ) : null}

        {loading && !data ? (
          <>
            <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
            </section>
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </section>
          </>
        ) : null}

        {data && !errorMsg ? (
          <>
            {/* KPIs */}
            <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Leads gerados" value={integer(data.summary.leads)} hint={`${campaigns.length} campanha${campaigns.length === 1 ? "" : "s"} no período`} delta={data.comparison?.leads} />
              <KpiCard label="Investimento" value={currency(data.summary.spend)} hint="no período selecionado" delta={data.comparison?.spend} />
              <KpiCard label="CPL" value={currency(data.summary.cpl)} hint="por lead" delta={data.comparison?.cpl} invert />
              <KpiCard label="CTR de link" value={percent(data.summary.ctrLink)} hint="cliques no link / impressões" delta={data.comparison?.ctrLink} />
            </section>
            <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <KpiCard label="CPM" value={currency(data.summary.cpm)} hint="custo por mil impressões" small />
              <KpiCard label="Alcance" value={integer(data.summary.reach)} hint="soma diária (aprox.)" small />
              <KpiCard label="Frequência" value={data.summary.frequency.toFixed(2)} hint="impressões / alcance" small />
            </section>

            {campaigns.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-10 text-center text-sm text-zinc-500">
                Nenhum resultado encontrado para o período selecionado.
              </div>
            ) : (
              <>
                {/* Charts */}
                <section className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
                    <h2 className="text-sm font-semibold">Leads por campanha</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">No período selecionado</p>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsByCampaignChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: "#3f3f46" }} interval={0} angle={-20} textAnchor="end" height={60} />
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="leads" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {leadsByCampaignChart.map((entry) => (
                              <Cell key={entry.id} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
                    <h2 className="text-sm font-semibold">Evolução do CPL</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">Dia a dia, histórico real</p>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `R$${v}`} />
                          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} formatter={(v) => `R$${Number(v ?? 0).toFixed(2)}`} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {trendSeriesKeys.map((key, i) => (
                            <Line key={key} type="monotone" dataKey={key} name={key} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                {/* Diagnóstico */}
                {diagnostics.length > 0 ? (
                  <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
                    <h2 className="text-sm font-semibold">Diagnóstico</h2>
                    <div className="mt-3 space-y-2">
                      {diagnostics.map((d, i) => (
                        <p
                          key={i}
                          className={`rounded-lg px-3 py-2 text-xs ${d.type === "positive" ? "bg-emerald-400/10 text-emerald-300" : d.type === "warning" ? "bg-amber-400/10 text-amber-300" : "bg-white/5 text-zinc-300"}`}
                        >
                          {d.message}
                        </p>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Campanhas */}
                <section className="mt-6">
                  <h2 className="text-sm font-semibold">Campanhas</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">No período selecionado</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {campaigns.map((c) => (
                      <CampaignCard key={c.id} c={c} />
                    ))}
                  </div>
                </section>

                {/* Anúncios */}
                <section className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold">Anúncios de melhor performance</h2>
                      <p className="mt-0.5 text-xs text-zinc-500">{ads.length} anúncio{ads.length === 1 ? "" : "s"} no escopo selecionado</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AD_TABS.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setAdTab(tab)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${adTab === tab ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
                        >
                          {AD_TAB_LABEL[tab]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {data.championLowSample && ads.some((a) => a.id === data.championAdId) ? (
                    <p className="mt-2 text-[11px] text-zinc-500">Amostra baixa no período — nenhum anúncio atingiu o volume mínimo de leads pra uma comparação mais confiável.</p>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {adsForTab.map((ad) => (
                      <button key={ad.id} onClick={() => setDetailAd(ad)} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3 text-left transition hover:border-white/25">
                        <div className="relative">
                          <AdThumb ad={ad} />
                          {ad.id === data.championAdId ? (
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-400/90 px-2 py-0.5 text-[10px] font-bold text-black">Campeão</span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-medium text-zinc-200">{ad.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500">{ad.campaignName}</p>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                          <MiniStat label="Leads" value={integer(ad.leads)} />
                          <MiniStat label="CPL" value={currency(ad.cpl)} />
                          <MiniStat label="CTR" value={percent(ad.ctrLink)} />
                        </div>
                      </button>
                    ))}
                    {adsForTab.length === 0 ? <p className="col-span-full text-sm text-zinc-500">Nenhum anúncio nessa categoria no período.</p> : null}
                  </div>
                </section>

                <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[11px] text-zinc-500">
                  <span>BRAIN Marketing e Performance · brainmktp.com.br</span>
                  <span>Dados reais persistidos via Meta Ads — {data.period.since} a {data.period.until}</span>
                </footer>
              </>
            )}
          </>
        ) : null}
      </div>

      {detailAd ? (
        <AdDetailModal
          ad={detailAd}
          onClose={() => setDetailAd(null)}
          client={client}
          period={period}
          customFrom={customFrom}
          customTo={customTo}
        />
      ) : null}
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[220px] rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function KpiCard({ label, value, hint, delta, invert, small }: { label: string; value: string; hint: string; delta?: number | null; invert?: boolean; small?: boolean }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 ${small ? "p-4" : "p-5"}`}>
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <div className={`mt-2 flex flex-wrap items-baseline gap-x-1.5 font-semibold tracking-tight text-white ${small ? "text-xl" : "text-3xl"}`}>
        <span>{value}</span>
        <DeltaBadge value={delta} invert={invert} />
      </div>
      <p className="mt-1.5 text-xs font-medium text-emerald-400">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/40 py-1.5">
      <p className="text-[9px] text-zinc-500">{label}</p>
      <p className="text-[11px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const metrics: { key: string; label: string; value: string }[] = [
    { key: "investimento", label: "Investimento", value: currency(c.spend) },
    { key: "leads", label: "Leads", value: integer(c.leads) },
    { key: "cpl", label: "CPL", value: currency(c.cpl) },
    { key: "ctrLink", label: "CTR Link", value: percent(c.ctrLink) },
    { key: "alcance", label: "Alcance", value: integer(c.reach) },
    { key: "frequencia", label: "Frequência", value: c.frequency.toFixed(2) },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{c.name}</h3>
        <StatusBadge status={c.status} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">{c.objective}</p>
      <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3 border-t border-white/10 pt-4">
        {metrics.map((m) => (
          <div key={m.key}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{m.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-white tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type AdTrendPoint = { date: string; spend: number; leads: number; cpl: number; ctrLink: number };
const TREND_METRICS = ["leads", "cpl", "spend", "ctrLink"] as const;
type TrendMetric = (typeof TREND_METRICS)[number];
const TREND_METRIC_LABEL: Record<TrendMetric, string> = { leads: "Leads", cpl: "CPL", spend: "Investimento", ctrLink: "CTR Link" };

function AdTrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: AdTrendPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 p-2.5 text-[11px]">
      <p className="font-semibold text-zinc-200">{shortDate(p.date)}</p>
      <p className="mt-1 text-zinc-400">Investimento: <span className="text-white">{currency(p.spend)}</span></p>
      <p className="text-zinc-400">Leads: <span className="text-white">{integer(p.leads)}</span></p>
      <p className="text-zinc-400">CPL: <span className="text-white">{currency(p.cpl)}</span></p>
      <p className="text-zinc-400">CTR Link: <span className="text-white">{percent(p.ctrLink)}</span></p>
    </div>
  );
}

function AdDetailModal({
  ad,
  onClose,
  client,
  period,
  customFrom,
  customTo,
}: {
  ad: Ad;
  onClose: () => void;
  client: string;
  period: string;
  customFrom: string;
  customTo: string;
}) {
  const [trend, setTrend] = useState<AdTrendPoint[] | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [metric, setMetric] = useState<TrendMetric>("leads");

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setTrendLoading(true);
      setTrendError(null);
      const qs = new URLSearchParams({ adId: ad.id, period });
      if (period === "custom") {
        qs.set("from", customFrom);
        qs.set("to", customTo);
      }
      try {
        const res = await fetch(`/api/reports/${client}/ad-trend?${qs.toString()}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erro HTTP ${res.status}`);
        setTrend(json.trend as AdTrendPoint[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setTrendError(err instanceof Error ? err.message : "Erro ao carregar série diária.");
      } finally {
        setTrendLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [ad.id, client, period, customFrom, customTo]);

  const chartData = useMemo(() => (trend ?? []).map((p) => ({ ...p, dateLabel: shortDate(p.date) })), [trend]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">{ad.campaignName}</p>
            <h3 className="mt-1 text-lg font-bold">{ad.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5">
            Fechar
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
          <AdThumb ad={ad} size="large" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Investimento" value={currency(ad.spend)} />
            <MiniStat label="Leads" value={integer(ad.leads)} />
            <MiniStat label="CPL" value={currency(ad.cpl)} />
            <MiniStat label="CTR Link" value={percent(ad.ctrLink)} />
            <MiniStat label="CPM" value={currency(ad.cpm)} />
            <MiniStat label="Alcance" value={integer(ad.reach)} />
            <MiniStat label="Impressões" value={integer(ad.impressions)} />
            <MiniStat label="Frequência" value={ad.frequency.toFixed(2)} />
            <MiniStat label="Status" value={STATUS_LABEL[ad.status || ""]?.label || "—"} />
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-zinc-400">
          {ad.leads > 0
            ? `Esse anúncio gerou ${ad.leads} lead${ad.leads === 1 ? "" : "s"} com investimento de ${currency(ad.spend)} (CPL de ${currency(ad.cpl)}) no período selecionado.`
            : `Esse anúncio não gerou leads no período selecionado, com investimento de ${currency(ad.spend)}.`}
        </p>

        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-zinc-300">Desempenho diário</h4>
            <div className="flex flex-wrap gap-1">
              {TREND_METRICS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${metric === m ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
                >
                  {TREND_METRIC_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 h-56">
            {trendLoading ? (
              <Skeleton className="h-full" />
            ) : trendError ? (
              <p className="text-xs text-red-400">{trendError}</p>
            ) : chartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-xs text-zinc-500">Sem entrega registrada nesse período — nada a mostrar (não interpolamos dias vazios).</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<AdTrendTooltip />} />
                  <Line type="monotone" dataKey={metric} name={TREND_METRIC_LABEL[metric]} stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
