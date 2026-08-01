import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { getMethodDetail } from "@/lib/methods-data";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MethodDetailActions } from "@/components/admin/MethodDetailActions";
import { DetailTabs, type TabDef } from "@/components/admin/DetailTabs";
import { MethodStagesPanel } from "@/components/admin/MethodStagesPanel";
import { VersionsPanel } from "@/components/admin/VersionsPanel";
import { ResourcesPanel } from "@/components/admin/ResourcesPanel";

export const dynamic = "force-dynamic";

const TABS: TabDef[] = [
  { id: "geral", label: "Visão Geral" },
  { id: "estrutura", label: "Estrutura" },
  { id: "playbooks", label: "Playbooks" },
  { id: "recursos", label: "Recursos" },
  { id: "versoes", label: "Versões" },
  { id: "historico", label: "Histórico" },
];

function formatDate(iso: string | Date | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function MethodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMethodDetail(id);
  if (!detail) notFound();

  const { method, products, stages, playbooks, versions, resources } = detail;

  const overview = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Problema que resolve</h2>
          <p className="text-sm text-os-muted">{method.problemSolved || "Não preenchido."}</p>
        </section>
        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Cliente ideal</h2>
          <p className="text-sm text-os-muted">{method.idealClientProfile || "Não preenchido."}</p>
        </section>
        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Resultado esperado</h2>
          <p className="text-sm text-os-muted">{method.expectedResult || "Não preenchido."}</p>
        </section>
      </div>
      <div className="space-y-4">
        {[
          { label: "Princípios", items: method.principles },
          { label: "Premissas", items: method.premises },
          { label: "Indicadores de sucesso", items: method.successIndicators },
          { label: "Riscos", items: method.risks },
        ].map((block) => (
          <section key={block.label} className="rounded-2xl border border-os-border bg-os-card p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">{block.label}</h2>
            {block.items.length === 0 ? (
              <p className="text-xs text-os-muted">Nenhum item cadastrado.</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-os-muted">
                {block.items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-os-accent">•</span> {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );

  const estrutura = <MethodStagesPanel methodId={method.id} stages={stages} />;

  const playbooksTab =
    playbooks.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-os-border bg-os-card/30 p-10 text-center">
        <p className="text-sm font-semibold text-os-ink">Nenhum playbook criado a partir deste método ainda.</p>
        <Link
          href={`/admin/playbooks/novo?methodId=${method.id}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-xs font-bold text-white hover:brightness-110"
        >
          Criar playbook
        </Link>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {playbooks.map((p) => (
          <Link
            key={p.id}
            href={`/admin/playbooks/${p.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-os-border bg-os-card p-4 hover:border-os-accent/50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-os-ink">{p.name}</p>
              <p className="text-xs text-os-muted">{p.type}</p>
            </div>
            <StatusBadge status={p.status} />
          </Link>
        ))}
      </div>
    );

  const recursos = <ResourcesPanel resources={resources} methodId={method.id} />;
  const versoes = <VersionsPanel versions={versions} currentVersion={method.version} currentStatus={method.status} />;

  const historico = (
    <div className="space-y-2">
      <div className="rounded-xl border border-os-border bg-os-card px-4 py-3 text-sm text-os-ink">
        Criado em {formatDate(method.createdAt)}
      </div>
      {versions
        .slice()
        .reverse()
        .map((v) => (
          <div key={v.id} className="rounded-xl border border-os-border bg-os-card px-4 py-3 text-sm text-os-ink">
            {v.status === "publicado" ? "Publicado" : "Arquivado"} v{v.versionLabel} em {formatDate(v.createdAt)}
          </div>
        ))}
      <div className="rounded-xl border border-os-border bg-os-card px-4 py-3 text-sm text-os-ink">
        Última atualização em {formatDate(method.updatedAt)}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={method.status} />
            <span className="text-xs font-semibold text-os-muted">v{method.version}</span>
          </div>
          <h1 className="text-xl font-black text-os-ink">{method.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-os-muted">{method.shortDescription ?? "Sem descrição curta."}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-os-muted">
            <span>{method.authorName ?? "Sem autor"}</span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" /> {playbooks.length} playbook{playbooks.length === 1 ? "" : "s"}
            </span>
            {products.length > 0 && <span>{products.map((p) => p.productName).join(", ")}</span>}
            <span>Atualizado {formatDate(method.updatedAt)}</span>
          </p>
        </div>
        <MethodDetailActions methodId={method.id} status={method.status} />
      </div>

      <DetailTabs
        tabs={TABS}
        content={{ geral: overview, estrutura, playbooks: playbooksTab, recursos, versoes, historico }}
      />
    </div>
  );
}
