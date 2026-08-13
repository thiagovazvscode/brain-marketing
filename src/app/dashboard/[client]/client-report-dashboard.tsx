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
import { Menu, ArrowLeftRight, Download, ChevronDown, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/layout/Footer";
import type { ComparisonResult } from "@/lib/reports/comparison";
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
const COMPARE_COLOR_A = "#2a78d6";
const COMPARE_COLOR_B = "#eb6834";

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
  previewUrl: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
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

// Classifica width/height reais (nunca inventados) no rótulo de formato mais
// próximo, com tolerância pequena pra variações de compressão/crop da Meta.
// Sem width/height conhecidos, não há badge — não adivinha proporção.
const KNOWN_RATIOS: { label: string; value: number }[] = [
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "9:16", value: 9 / 16 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
];
function formatBadge(w: number | null, h: number | null): { ratio: string; dims: string } | null {
  if (!w || !h) return null;
  const actual = w / h;
  let closest = KNOWN_RATIOS[0];
  let closestDiff = Math.abs(actual - closest.value);
  for (const r of KNOWN_RATIOS) {
    const diff = Math.abs(actual - r.value);
    if (diff < closestDiff) {
      closest = r;
      closestDiff = diff;
    }
  }
  const ratio = closestDiff <= 0.04 ? closest.label : `${w}:${h}`;
  return { ratio, dims: `${w}×${h}` };
}

function AdThumb({ ad, size = "normal" }: { ad: Ad; size?: "normal" | "large" }) {
  const src = ad.previewUrl || ad.thumbnailUrl;
  const badge = formatBadge(ad.mediaWidth, ad.mediaHeight);
  // Container de altura fixa e consistente pra grade — a imagem nunca é
  // esticada/cortada dentro dele (object-contain), com letterboxing neutro
  // quando a proporção real do creative não preenche a caixa inteira.
  const boxCls = size === "large" ? "h-[420px] w-full max-w-[340px]" : "h-44 w-full sm:h-52";

  return (
    <div className={`relative ${boxCls} overflow-hidden rounded-xl border border-white/10 bg-black/60`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={ad.name} className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full items-center justify-center text-center text-[11px] text-zinc-500">Prévia indisponível</div>
      )}
      {badge ? (
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200">
          {badge.ratio}
        </span>
      ) : null}
    </div>
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

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [comparePickerOpen, setComparePickerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<{ a: string; b: string } | null>(null);
  const [compareData, setCompareData] = useState<ComparisonResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Query string do período ativo — reaproveitada por comparação e exportação
  // (PDF), pra nunca divergir do que está selecionado no dashboard (item 7).
  const periodQuery = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set("period", period);
    if (period === "custom") {
      qs.set("from", customFrom);
      qs.set("to", customTo);
    }
    return qs;
  }, [period, customFrom, customTo]);

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

  // Comparação usa sempre o MESMO período ativo do dashboard (item 7) — por
  // isso reage a period/customFrom/customTo, não só à escolha de A/B.
  useEffect(() => {
    if (!compareIds || !canFetch) return;
    const controller = new AbortController();

    async function run() {
      if (!compareIds) return;
      setCompareLoading(true);
      setCompareError(null);
      const qs = periodQuery();
      qs.set("campaignIdA", compareIds.a);
      qs.set("campaignIdB", compareIds.b);
      try {
        const res = await fetch(`/api/reports/${client}/compare?${qs.toString()}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erro HTTP ${res.status}`);
        setCompareData(json as ComparisonResult);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setCompareError(err instanceof Error ? err.message : "Erro ao comparar campanhas.");
      } finally {
        setCompareLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [compareIds, client, canFetch, periodQuery]);

  const exportPdfHref = useCallback(
    (scope: "current" | "compare") => {
      const qs = periodQuery();
      if (scope === "compare" && compareIds) {
        qs.set("campaignIdA", compareIds.a);
        qs.set("campaignIdB", compareIds.b);
      } else {
        if (campaignId !== "all") qs.set("campaignId", campaignId);
        if (adsetId !== "all") qs.set("adsetId", adsetId);
        if (adId !== "all") qs.set("adId", adId);
      }
      return `/api/reports/${client}/pdf?${qs.toString()}`;
    },
    [periodQuery, compareIds, campaignId, adsetId, adId, client]
  );

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
    <div id="top" className="min-h-screen bg-black text-white">
      <PortalHeader displayName={displayName} />

      <main className="px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          {/* Boas-vindas / contexto do cliente */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-5">
            <h1 className="text-xl font-bold sm:text-2xl">Seja bem-vindo, {displayName}.</h1>
            <p className="mt-1 text-sm text-zinc-400">Esta é a sua dashboard de performance.</p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-4 text-xs text-zinc-500">
              <span>
                Conta Meta <span className="ml-1.5 font-semibold text-zinc-300">{data?.account?.name ?? "—"}</span>
              </span>
              <span>
                Última atualização{" "}
                <span className="ml-1.5 font-semibold text-zinc-300">
                  {data?.lastSync ? new Date(data.lastSync).toLocaleString("pt-BR") : "—"}
                </span>
              </span>
              <span>
                Status{" "}
                <span className="ml-1.5 inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Atualizado
                </span>
              </span>
            </div>
          </section>

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

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setComparePickerOpen(true)}
              disabled={allCampaigns.length < 2}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              Comparar campanhas
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                aria-expanded={exportMenuOpen}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Exportar
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {exportMenuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900 p-1.5 text-sm shadow-xl">
                  <a
                    href={exportPdfHref(compareData ? "compare" : "current")}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setExportMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5"
                  >
                    Gerar relatório PDF
                  </a>
                  <span className="mt-1 block rounded-lg px-3 py-2 text-xs text-zinc-600">
                    Exportar leads (Excel/CSV) — em implantação
                  </span>
                </div>
              ) : null}
            </div>
          </div>
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
                <section id="campanhas" className="mt-6 scroll-mt-20">
                  <h2 className="text-sm font-semibold">Campanhas</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">No período selecionado</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {campaigns.map((c) => (
                      <CampaignCard key={c.id} c={c} />
                    ))}
                  </div>
                </section>

                {/* Anúncios */}
                <section id="anuncios" className="mt-6 scroll-mt-20">
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

                <p className="mt-8 border-t border-white/10 pt-4 text-[11px] text-zinc-500">
                  Dados reais persistidos via Meta Ads — {data.period.since} a {data.period.until}
                </p>
              </>
            )}
          </>
        ) : null}
        </div>
      </main>

      <Footer />

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

      {comparePickerOpen ? (
        <ComparePickerModal
          campaigns={allCampaigns}
          onClose={() => setComparePickerOpen(false)}
          onConfirm={(a, b) => {
            setCompareData(null);
            setCompareIds({ a, b });
            setComparePickerOpen(false);
          }}
        />
      ) : null}

      {compareIds ? (
        <CampaignComparisonPanel
          loading={compareLoading}
          error={compareError}
          data={compareData}
          onClose={() => {
            setCompareIds(null);
            setCompareData(null);
            setCompareError(null);
          }}
          exportPdfHref={exportPdfHref("compare")}
        />
      ) : null}
    </div>
  );
}

const PORTAL_NAV_ITEMS: { label: string; href: string; external?: boolean }[] = [
  { label: "Dashboard", href: "#top" },
  { label: "Campanhas", href: "#campanhas" },
  { label: "Anúncios", href: "#anuncios" },
  { label: "Nossos serviços", href: "/#solucoes", external: true },
];

function PortalHeader({ displayName }: { displayName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 py-3 sm:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Brain Marketing & Performance — início">
            <Logo width={112} height={34} />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-400 md:flex">
            {PORTAL_NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={navOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/5 md:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 text-xs font-semibold text-zinc-300 hover:bg-white/5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-300">
                {initials || "?"}
              </span>
              {displayName}
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-zinc-900 p-1.5 text-sm shadow-xl">
                <Link href="/" className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5">
                  Voltar ao site
                </Link>
                <span className="block rounded-lg px-3 py-2 text-zinc-600">Conta e login — em breve</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {navOpen ? (
        <nav className="border-t border-white/10 px-6 py-2 text-sm font-medium text-zinc-400 md:hidden" aria-label="Navegação do portal">
          <ul className="space-y-1">
            {PORTAL_NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={() => setNavOpen(false)}
                  className="block rounded-lg px-2 py-2 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
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
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-6 sm:rounded-2xl"
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

        <div className="mt-4 grid gap-4 sm:grid-cols-[340px_1fr]">
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
            <MiniStat label="Formato" value={formatBadge(ad.mediaWidth, ad.mediaHeight)?.dims ?? "—"} />
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

function ComparePickerModal({
  campaigns,
  onClose,
  onConfirm,
}: {
  campaigns: { id: string; name: string; status: string | null }[];
  onClose: () => void;
  onConfirm: (a: string, b: string) => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const canConfirm = a && b && a !== b;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Comparar campanhas</h3>
            <p className="mt-1 text-xs text-zinc-500">Selecione exatamente duas campanhas reais desta conta.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500">Campanha A</label>
            <select
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === b}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500">Campanha B</label>
            <select
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === a}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={() => canConfirm && onConfirm(a, b)}
            disabled={!canConfirm}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  );
}

const COMPARE_BAR_METRICS: { key: "leads" | "cpl" | "spend" | "ctrLink"; label: string; format: "integer" | "currency" | "percent" }[] = [
  { key: "leads", label: "Leads", format: "integer" },
  { key: "cpl", label: "CPL", format: "currency" },
  { key: "spend", label: "Investimento", format: "currency" },
  { key: "ctrLink", label: "CTR Link", format: "percent" },
];

const COMPARE_TREND_METRICS = ["leads", "cpl", "spend", "ctrLink"] as const;
type CompareTrendMetric = (typeof COMPARE_TREND_METRICS)[number];
const COMPARE_TREND_LABEL: Record<CompareTrendMetric, string> = { leads: "Leads", cpl: "CPL", spend: "Investimento", ctrLink: "CTR Link" };

function formatByKind(value: number, format: "currency" | "integer" | "percent" | "decimal") {
  if (format === "currency") return currency(value);
  if (format === "percent") return percent(value);
  if (format === "decimal") return value.toFixed(2);
  return integer(value);
}

function CampaignComparisonPanel({
  loading,
  error,
  data,
  onClose,
  exportPdfHref,
}: {
  loading: boolean;
  error: string | null;
  data: ComparisonResult | null;
  onClose: () => void;
  exportPdfHref: string;
}) {
  const [trendMetric, setTrendMetric] = useState<CompareTrendMetric>("leads");

  const barData = useMemo(() => {
    if (!data) return [];
    return COMPARE_BAR_METRICS.map((m) => ({
      metric: m.label,
      format: m.format,
      a: data.a.metrics[m.key],
      b: data.b.metrics[m.key],
    }));
  }, [data]);

  const trendChartData = useMemo(() => {
    if (!data) return [];
    const dates = Array.from(new Set([...data.a.trend.map((p) => p.date), ...data.b.trend.map((p) => p.date)])).sort();
    return dates.map((date) => {
      const pa = data.a.trend.find((p) => p.date === date);
      const pb = data.b.trend.find((p) => p.date === date);
      return {
        date: shortDate(date),
        a: pa ? pa[trendMetric] : null,
        b: pb ? pb[trendMetric] : null,
      };
    });
  }, [data, trendMetric]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">Comparativo de campanhas</h3>
          <div className="flex items-center gap-2">
            {data ? (
              <a
                href={exportPdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Exportar PDF
              </a>
            ) : null}
            <button onClick={onClose} aria-label="Fechar" className="rounded-full border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-48" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        ) : data ? (
          <>
            {/* Campanha A VS Campanha B */}
            <div className="mt-5 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-2xl border p-4" style={{ borderColor: COMPARE_COLOR_A + "55", backgroundColor: COMPARE_COLOR_A + "14" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Campanha A</p>
                <p className="mt-1 text-base font-bold text-white">{data.a.name}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {data.a.activeDays} dia{data.a.activeDays === 1 ? "" : "s"} ativo{data.a.activeDays === 1 ? "" : "s"} no período
                </p>
              </div>
              <p className="justify-self-center text-sm font-bold text-zinc-500">VS</p>
              <div className="rounded-2xl border p-4" style={{ borderColor: COMPARE_COLOR_B + "55", backgroundColor: COMPARE_COLOR_B + "14" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Campanha B</p>
                <p className="mt-1 text-base font-bold text-white">{data.b.name}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {data.b.activeDays} dia{data.b.activeDays === 1 ? "" : "s"} ativo{data.b.activeDays === 1 ? "" : "s"} no período
                </p>
              </div>
            </div>

            {/* Tabela/matriz — desktop */}
            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-white/10 sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-2.5 font-semibold">Métrica</th>
                    <th className="px-4 py-2.5 font-semibold">{data.a.name}</th>
                    <th className="px-4 py-2.5 font-semibold">{data.b.name}</th>
                    <th className="px-4 py-2.5 font-semibold">Diferença (B vs A)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.diffs.map((d) => (
                    <tr key={d.key} className="border-t border-white/10">
                      <td className="px-4 py-2.5 text-zinc-300">{d.label}</td>
                      <td className="px-4 py-2.5 font-medium text-white">{formatByKind(d.a, d.format)}</td>
                      <td className="px-4 py-2.5 font-medium text-white">{formatByKind(d.b, d.format)}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{d.diffPct === null ? "—" : `${d.diffPct > 0 ? "+" : ""}${d.diffPct.toFixed(1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards empilhados — mobile (evita tabela horizontal ilegível) */}
            <div className="mt-5 space-y-2 sm:hidden">
              {data.diffs.map((d) => (
                <div key={d.key} className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                  <p className="text-xs font-semibold text-zinc-400">{d.label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-zinc-500">{data.a.name}</p>
                      <p className="text-sm font-semibold text-white">{formatByKind(d.a, d.format)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">{data.b.name}</p>
                      <p className="text-sm font-semibold text-white">{formatByKind(d.b, d.format)}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    Diferença (B vs A): {d.diffPct === null ? "—" : `${d.diffPct > 0 ? "+" : ""}${d.diffPct.toFixed(1)}%`}
                  </p>
                </div>
              ))}
            </div>

            {/* Gráfico de barras — KPIs principais */}
            <h4 className="mt-6 text-sm font-semibold">KPIs principais</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {barData.map((row) => (
                <div key={row.metric} className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-400">{row.metric}</p>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: row.metric, a: row.a, b: row.b }]} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip
                          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                          formatter={(v) => formatByKind(Number(v) || 0, row.format)}
                        />
                        <Bar dataKey="a" name={data.a.name} fill={COMPARE_COLOR_A} radius={[4, 4, 4, 4]} barSize={16} />
                        <Bar dataKey="b" name={data.b.name} fill={COMPARE_COLOR_B} radius={[4, 4, 4, 4]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>

            {/* Evolução diária — Leads/CPL/Investimento/CTR */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Evolução diária</h4>
              <div className="flex flex-wrap gap-1.5">
                {COMPARE_TREND_METRICS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setTrendMetric(m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${trendMetric === m ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
                  >
                    {COMPARE_TREND_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 h-64 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
              {trendChartData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-xs text-zinc-500">Sem entrega registrada nesse período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="a" name={data.a.name} stroke={COMPARE_COLOR_A} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line type="monotone" dataKey="b" name={data.b.name} stroke={COMPARE_COLOR_B} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Diagnóstico comparativo */}
            <h4 className="mt-6 text-sm font-semibold">Diagnóstico comparativo</h4>
            <div className="mt-3 space-y-2">
              {data.diagnostics.map((d, i) => (
                <p key={i} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300">
                  {d}
                </p>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
