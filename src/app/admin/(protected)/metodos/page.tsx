import Link from "next/link";
import { Workflow, FileText } from "lucide-react";
import {
  getMethodsOverviewStats,
  getMethodsSummary,
  getPlaybooksSummary,
  getMethodsRecentlyUpdated,
  getPlaybooksByProduct,
  getDraftPlaybooksAwaitingCompletion,
  getRecentMethodActivity,
  getAllResourcesWithContext,
} from "@/lib/methods-data";
import { MethodsLibrary } from "@/components/admin/MethodsLibrary";
import { PlaybooksLibrary } from "@/components/admin/PlaybooksLibrary";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailTabs, type TabDef } from "@/components/admin/DetailTabs";
import { resourceTypeLabel } from "@/lib/methods";

export const dynamic = "force-dynamic";

const TABS: TabDef[] = [
  { id: "geral", label: "Visão Geral" },
  { id: "metodos", label: "Métodos" },
  { id: "playbooks", label: "Playbooks" },
  { id: "aplicacoes", label: "Aplicações", comingSoon: true },
  { id: "recursos", label: "Recursos" },
  { id: "indicadores", label: "Indicadores", comingSoon: true },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-os-border bg-os-card p-5">
      <p className="text-2xl font-black tabular-nums text-os-ink">{value}</p>
      <p className="mt-1 text-xs font-medium text-os-muted">{label}</p>
    </div>
  );
}

export default async function MetodosHubPage() {
  const [stats, methods, playbooks, recentlyUpdated, byProduct, drafts, recentActivity, allResources] = await Promise.all([
    getMethodsOverviewStats(),
    getMethodsSummary(),
    getPlaybooksSummary(),
    getMethodsRecentlyUpdated(),
    getPlaybooksByProduct(),
    getDraftPlaybooksAwaitingCompletion(),
    getRecentMethodActivity(),
    getAllResourcesWithContext(),
  ]);

  const overview = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Métodos ativos" value={stats.activeMethods} />
        <StatTile label="Playbooks cadastrados" value={stats.playbooksTotal} />
        <StatTile label="Playbooks publicados" value={stats.playbooksPublished} />
        <StatTile label="Playbooks em rascunho" value={stats.playbooksDraft} />
        <StatTile label="Produtos com método" value={stats.productsWithMethod} />
        <StatTile label="Atualizações (7 dias)" value={stats.recentUpdates} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Métodos recentemente atualizados</h2>
          {recentlyUpdated.length === 0 ? (
            <p className="text-xs text-os-muted">Nenhum método cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentlyUpdated.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/metodos/${m.id}`} className="min-w-0 truncate text-sm font-medium text-os-ink hover:text-os-accent">
                    {m.name}
                  </Link>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Playbooks por produto</h2>
          {byProduct.length === 0 ? (
            <p className="text-xs text-os-muted">Nenhum playbook cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {byProduct.map((row) => (
                <li key={row.productName} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-os-ink">{row.productName}</span>
                  <span className="font-bold text-os-muted">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Rascunhos aguardando conclusão</h2>
          {drafts.length === 0 ? (
            <p className="text-xs text-os-muted">Nenhum rascunho pendente.</p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/playbooks/${d.id}`} className="min-w-0 truncate text-sm font-medium text-os-ink hover:text-os-accent">
                    {d.name}
                  </Link>
                  <span className="text-xs text-os-muted">{formatDate(d.updatedAt.toISOString())}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Atividade recente</h2>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-os-muted">Nenhuma atividade ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a) => (
                <li key={`${a.kind}-${a.id}`} className="flex items-center justify-between gap-2">
                  <Link
                    href={a.kind === "method" ? `/admin/metodos/${a.id}` : `/admin/playbooks/${a.id}`}
                    className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-os-ink hover:text-os-accent"
                  >
                    <span className="shrink-0 rounded-full bg-os-bg px-1.5 py-0.5 text-[10px] font-bold uppercase text-os-muted">
                      {a.kind === "method" ? "Método" : "Playbook"}
                    </span>
                    {a.name}
                  </Link>
                  <span className="shrink-0 text-xs text-os-muted">{formatDate(a.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );

  const recursos =
    allResources.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-os-border bg-os-card/30 p-10 text-center">
        <p className="text-sm font-semibold text-os-ink">Nenhum recurso cadastrado ainda.</p>
        <p className="mt-1 text-xs text-os-muted">Recursos são cadastrados a partir de um método ou playbook específico.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allResources.map((r) => (
          <div key={r.id} className="rounded-xl border border-os-border bg-os-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-os-ink">
                <FileText className="h-3.5 w-3.5 shrink-0 text-os-muted" />
                <span className="truncate">{r.title}</span>
              </p>
              <span className="shrink-0 rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-bold text-os-muted">{resourceTypeLabel(r.type)}</span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-os-muted">
              <Workflow className="h-3 w-3" />
              {r.methodName ?? r.playbookName ?? "—"}
            </p>
          </div>
        ))}
      </div>
    );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Central de Métodos &amp; Playbooks</h1>
        <p className="text-sm text-os-muted">Construa, padronize e acompanhe os processos da Brain.</p>
      </div>

      <DetailTabs
        tabs={TABS}
        content={{
          geral: overview,
          metodos: <MethodsLibrary methods={methods} />,
          playbooks: <PlaybooksLibrary playbooks={playbooks} />,
          recursos,
        }}
      />
    </div>
  );
}
