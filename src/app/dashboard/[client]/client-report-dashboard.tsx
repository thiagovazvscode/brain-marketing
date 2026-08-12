"use client";

/**
 * Dashboard de performance (Facebook Ads) — dados reais, via BrokerApps.
 * Este componente e' generico: qualquer cliente com integracao Meta
 * conectada no BrokerApps funciona aqui so adicionando uma entrada em
 * src/lib/reports/clients.ts, sem tocar neste arquivo.
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
import type {
  BrokerMetaAd,
  BrokerMetaCampaign,
  BrokerReportResponse,
  BrokerTrendPoint,
} from "@/lib/reports/broker-client";

const PALETTE = ["#2a78d6", "#eb6834", "#16a34a", "#a855f7", "#eab308", "#ec4899"];

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
  { value: "maximum", label: "Desde o início" },
  { value: "custom", label: "Personalizado" },
];

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ACTIVE: { label: "Ativa", bg: "#0ca30c1a", text: "#4ade80", dot: "#22c55e" },
  PAUSED: { label: "Pausada", bg: "#fab2191a", text: "#fbbf24", dot: "#f59e0b" },
  DELETED: { label: "Excluída", bg: "#ef44441a", text: "#f87171", dot: "#ef4444" },
  ARCHIVED: { label: "Arquivada", bg: "#71717a1a", text: "#a1a1aa", dot: "#71717a" },
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
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}`;
}

function num(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-emerald-400">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_LABEL[status] || STATUS_LABEL.ARCHIVED;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

function CampaignCard({ c }: { c: BrokerMetaCampaign }) {
  const metrics: { key: string; label: string; value: string }[] = [
    { key: "investimento", label: "Investimento", value: currency(num(c.spend)) },
    { key: "leads", label: "Leads", value: integer(num(c.leads)) },
    { key: "cpl", label: "CPL", value: currency(num(c.cpl)) },
    { key: "ctr", label: "CTR", value: percent(num(c.ctr)) },
    { key: "alcance", label: "Alcance", value: integer(num(c.reach)) },
    { key: "frequencia", label: "Frequência", value: num(c.frequency).toFixed(2) },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{str(c.campaignName, "Campanha")}</h3>
        <StatusBadge status={str(c.status, "ARCHIVED")} />
      </div>
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

function AdChampionCard({ ad, color }: { ad: BrokerMetaAd; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <p className="text-xs font-semibold text-zinc-400">{str(ad.campaignName, "Campanha")}</p>
      {ad.thumbnailUrl ? (
        <div className="mt-3 max-w-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(ad.thumbnailUrl)}
            alt={str(ad.adName, "Anúncio")}
            className="aspect-[9/16] w-full rounded-xl border border-white/10 object-cover"
          />
        </div>
      ) : null}
      <p className="mt-3 text-sm font-semibold text-white">{str(ad.adName, "Anúncio")}</p>
      <span
        className="mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        Melhor anúncio da campanha
      </span>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-black/40 py-2">
          <p className="text-[10px] text-zinc-500">Leads</p>
          <p className="text-sm font-semibold tabular-nums">{integer(num(ad.leads))}</p>
        </div>
        <div className="rounded-lg bg-black/40 py-2">
          <p className="text-[10px] text-zinc-500">CPL</p>
          <p className="text-sm font-semibold tabular-nums">{currency(num(ad.cpl))}</p>
        </div>
        <div className="rounded-lg bg-black/40 py-2">
          <p className="text-[10px] text-zinc-500">CTR</p>
          <p className="text-sm font-semibold tabular-nums">{percent(num(ad.ctr))}</p>
        </div>
      </div>
    </div>
  );
}

export function ClientReportDashboard({ client, displayName }: { client: string; displayName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPeriod = searchParams.get("period") || "last_30d";
  const initialCampaign = searchParams.get("campaign") || "all";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  const [period, setPeriod] = useState(initialPeriod);
  const [campaignFilter, setCampaignFilter] = useState(initialCampaign);
  const [customFrom, setCustomFrom] = useState(initialFrom);
  const [customTo, setCustomTo] = useState(initialTo);
  const [data, setData] = useState<BrokerReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canFetch = period !== "custom" || (customFrom && customTo);

  const updateUrl = useCallback(
    (next: { period: string; campaign: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      qs.set("period", next.period);
      if (next.campaign !== "all") qs.set("campaign", next.campaign);
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
      if (campaignFilter !== "all") qs.set("campaignId", campaignFilter);

      try {
        const res = await fetch(`/api/reports/${client}?${qs.toString()}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erro HTTP ${res.status}`);
        setData(json as BrokerReportResponse);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar relatório.");
      } finally {
        setLoading(false);
      }
    }

    run();
    updateUrl({ period, campaign: campaignFilter, from: customFrom, to: customTo });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, campaignFilter, customFrom, customTo, client, canFetch]);

  const campaigns = useMemo(() => data?.campaigns ?? [], [data]);
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const ads = useMemo(() => data?.ads ?? [], [data]);

  const campaignColor = useMemo(() => {
    const map = new Map<string, string>();
    campaigns.forEach((c, i) => map.set(str(c.campaignId), PALETTE[i % PALETTE.length]));
    return map;
  }, [campaigns]);

  const kpis = useMemo(() => {
    const leadsTotal = campaigns.reduce((sum, c) => sum + num(c.leads), 0);
    const spendTotal = campaigns.reduce((sum, c) => sum + num(c.spend), 0);
    const clicksTotal = campaigns.reduce((sum, c) => sum + num(c.clicks), 0);
    const impressionsTotal = campaigns.reduce((sum, c) => sum + num(c.impressions), 0);
    const cplMedio = leadsTotal > 0 ? spendTotal / leadsTotal : 0;
    const ctrMedio = impressionsTotal > 0 ? (clicksTotal / impressionsTotal) * 100 : 0;

    return [
      { label: "Leads gerados (total)", value: integer(leadsTotal), hint: `${campaigns.length} campanha${campaigns.length === 1 ? "" : "s"}` },
      { label: "Investimento total", value: currency(spendTotal), hint: "no período selecionado" },
      { label: "CPL médio", value: currency(cplMedio), hint: "por lead, ponderado" },
      { label: "CTR médio", value: percent(ctrMedio), hint: "no período selecionado" },
    ];
  }, [campaigns]);

  const leadsByCampaignChart = useMemo(
    () =>
      campaigns.map((c) => ({
        name: str(c.campaignName, "Campanha"),
        leads: num(c.leads),
        fill: campaignColor.get(str(c.campaignId)) || PALETTE[0],
      })),
    [campaigns, campaignColor]
  );

  const trendChart = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    trend.forEach((t: BrokerTrendPoint) => {
      const dateKey = str(t.date);
      const row = byDate.get(dateKey) || { date: shortDate(dateKey) };
      row[str(t.campaignName)] = num(t.cpl);
      byDate.set(dateKey, row);
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, row]) => row);
  }, [trend]);

  const trendCampaignNames = useMemo(() => {
    const names = new Set<string>();
    trend.forEach((t) => names.add(str(t.campaignName)));
    return Array.from(names);
  }, [trend]);

  const championAds = useMemo(() => {
    const byCampaign = new Map<string, BrokerMetaAd[]>();
    ads.forEach((ad) => {
      const key = str(ad.campaignId);
      const list = byCampaign.get(key) || [];
      list.push(ad);
      byCampaign.set(key, list);
    });
    return Array.from(byCampaign.entries()).map(([campaignId, list]) => {
      const best = [...list].sort((a, b) => num(b.leads) - num(a.leads) || num(b.ctr) - num(a.ctr))[0];
      return { campaignId, ad: best };
    });
  }, [ads]);

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
          </div>
          <div className="flex items-center gap-3">
            {data ? (
              <div className="text-right text-xs text-zinc-500">
                {data.stale ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                    Dados em cache — Meta indisponível no momento
                  </span>
                ) : (
                  <>
                    Atualizado em{" "}
                    <span className="font-semibold text-zinc-300">
                      {new Date(data.generatedAt).toLocaleString("pt-BR")}
                    </span>
                  </>
                )}
              </div>
            ) : null}
            <Link
              href="/"
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5"
            >
              Voltar ao site
            </Link>
          </div>
        </header>

        {/* Filtros */}
        <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500" htmlFor="period-select">
              Período
            </label>
            <select
              id="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {period === "custom" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
              />
              <span className="text-xs text-zinc-500">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500" htmlFor="campaign-select">
              Campanha
            </label>
            <select
              id="campaign-select"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
            >
              <option value="all">Todas as campanhas</option>
              {(data?.campaigns ?? campaigns).map((c) => (
                <option key={str(c.campaignId)} value={str(c.campaignId)}>
                  {str(c.campaignName)}
                </option>
              ))}
            </select>
          </div>
        </section>

        {errorMsg ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {errorMsg}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-10 text-center text-sm text-zinc-500">
            Carregando dados do Meta Ads...
          </div>
        ) : null}

        {data && !errorMsg ? (
          <>
            {/* KPIs */}
            <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {kpis.map((k) => (
                <KpiCard key={k.label} {...k} />
              ))}
            </section>

            {/* Charts */}
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
                <h2 className="text-sm font-semibold">Leads por campanha</h2>
                <p className="mt-0.5 text-xs text-zinc-500">No período selecionado</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsByCampaignChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="leads" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {leadsByCampaignChart.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
                <h2 className="text-sm font-semibold">Evolução do CPL</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Dia a dia, no período selecionado</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={{ stroke: "#3f3f46" }} />
                      <YAxis
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `R$${v}`}
                      />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => `R$${Number(v ?? 0).toFixed(2)}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {trendCampaignNames.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          name={name}
                          stroke={PALETTE[i % PALETTE.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Campanhas */}
            <section className="mt-6">
              <h2 className="text-sm font-semibold">Campanhas</h2>
              <p className="mt-0.5 text-xs text-zinc-500">No período selecionado</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {campaigns.map((c) => (
                  <CampaignCard key={str(c.campaignId)} c={c} />
                ))}
                {campaigns.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhuma campanha com dados neste período.</p>
                ) : null}
              </div>
            </section>

            {/* Anúncios */}
            <section className="mt-6">
              <h2 className="text-sm font-semibold">Melhor anúncio por campanha</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Por leads, no período selecionado</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {championAds.map(({ campaignId, ad }) => (
                  <AdChampionCard key={campaignId} ad={ad} color={campaignColor.get(campaignId) || PALETTE[0]} />
                ))}
                {championAds.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum anúncio com dados neste período.</p>
                ) : null}
              </div>
            </section>

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[11px] text-zinc-500">
              <span>BRAIN Marketing e Performance · brainmktp.com.br</span>
              <span>Dados em tempo real via Meta Ads</span>
            </footer>
          </>
        ) : null}
      </div>
    </main>
  );
}
