"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, MousePointerClick, Users, Percent, Loader2 } from "lucide-react";
import type { AnalyticsPeriod, AnalyticsPeriodData } from "@/types/tracking";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

const FUNNEL_LABELS = [
  "Objetivo principal",
  "Perfil no mercado",
  "Captação hoje",
  "Gestão de leads",
  "Vitória em 90 dias",
];

const EMPTY_DATA: AnalyticsPeriodData = {
  pageViews: [],
  clicks: [],
  leadsCount: 0,
  quizCompletionRate: 0,
  quizFunnel: [],
};

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-elevated/50 p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/15 text-brand-magenta">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-black tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

function HorizontalBarList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-2xl border border-line bg-elevated/50 p-5">
      <h3 className="mb-4 text-sm font-bold text-ink">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-muted">{item.label}</span>
              <span className="shrink-0 font-bold tabular-nums text-ink">{item.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
              <div
                className="h-full rounded-full bg-brand-primary"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizFunnel({ steps }: { steps: { label: string; reached: number }[] }) {
  const max = steps[0]?.reached || 1;
  return (
    <div className="rounded-2xl border border-line bg-elevated/50 p-5">
      <h3 className="mb-4 text-sm font-bold text-ink">Funil do quiz</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const pct = (step.reached / max) * 100;
          const dropoff = i > 0 ? steps[i - 1].reached - step.reached : 0;
          return (
            <div key={step.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted">
                  {i + 1}. {step.label}
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  <span className="font-bold">{step.reached}</span>
                  {i > 0 && dropoff > 0 && (
                    <span className="ml-1.5 text-red-400/80">−{dropoff}</span>
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [data, setData] = useState<AnalyticsPeriodData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(`/api/admin/analytics/summary?period=${period}`).then((r) => r.json()),
      fetch(`/api/admin/analytics/quiz-funnel?period=${period}`).then((r) => r.json()),
    ])
      .then(([summary, funnel]) => {
        if (!active) return;
        setData({
          pageViews: summary.pageViews ?? [],
          clicks: summary.clicks ?? [],
          leadsCount: summary.leadsCount ?? 0,
          quizCompletionRate: summary.quizCompletionRate ?? 0,
          quizFunnel: (funnel.funnel ?? []).map((f: { step: number; reached: number }) => ({
            step: f.step,
            label: FUNNEL_LABELS[f.step - 1] ?? `Passo ${f.step}`,
            reached: f.reached,
          })),
        });
      })
      .catch(() => {
        if (active) setData(EMPTY_DATA);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  const totalPageViews = useMemo(
    () => data.pageViews.reduce((sum, p) => sum + p.count, 0),
    [data]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-ink">
            Dashboard
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
          </h1>
          <p className="text-sm text-muted">Visão geral de tráfego, cliques e leads.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-elevated/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                period === p.value
                  ? "bg-brand-primary text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Eye} label="Page views" value={totalPageViews.toLocaleString("pt-BR")} />
        <StatTile
          icon={MousePointerClick}
          label="Cliques rastreados"
          value={data.clicks.reduce((s, c) => s + c.count, 0).toLocaleString("pt-BR")}
        />
        <StatTile icon={Users} label="Leads gerados" value={data.leadsCount.toString()} />
        <StatTile
          icon={Percent}
          label="Conclusão do quiz"
          value={`${Math.round(data.quizCompletionRate * 100)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HorizontalBarList title="Page views por página" items={data.pageViews} />
        <HorizontalBarList title="Cliques por elemento" items={data.clicks} />
      </div>

      <div className="mt-4">
        <QuizFunnel steps={data.quizFunnel} />
      </div>
    </div>
  );
}
