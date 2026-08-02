import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Wand2 } from "lucide-react";
import { getPlaybookDetail } from "@/lib/methods-data";
import { getStagesWithBlocks } from "@/lib/playbook-builder";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PlaybookDetailActions } from "@/components/admin/PlaybookDetailActions";
import { DetailTabs, type TabDef } from "@/components/admin/DetailTabs";
import { VersionsPanel } from "@/components/admin/VersionsPanel";
import { ResourcesPanel } from "@/components/admin/ResourcesPanel";
import { PlaybookValidationPanel } from "@/components/admin/PlaybookValidationPanel";
import { playbookTypeLabel, durationUnitLabel } from "@/lib/methods";

export const dynamic = "force-dynamic";

const TABS: TabDef[] = [
  { id: "resumo", label: "Resumo" },
  { id: "estrutura", label: "Estrutura" },
  { id: "recursos", label: "Recursos" },
  { id: "validacao", label: "Validação" },
  { id: "versoes", label: "Versões" },
  { id: "historico", label: "Histórico" },
];

function formatDate(iso: string | Date | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-os-border bg-os-card p-5">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="text-xs text-os-muted">Nenhum item cadastrado.</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-os-muted">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-os-accent">•</span> {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function PlaybookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPlaybookDetail(id);
  if (!detail) notFound();

  const { playbook, method, product, versions, resources } = detail;
  // Não chama ensureDraftVersion aqui — visitar o detalhe não deve abrir um
  // rascunho sozinho. currentVersionId só existe depois que alguém abre o
  // construtor pelo menos uma vez (Fase 2.1).
  const stages = playbook.currentVersionId ? await getStagesWithBlocks(playbook.currentVersionId) : [];

  const resumo = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Objetivo</h2>
          <p className="text-sm text-os-muted">{playbook.objective || "Não preenchido."}</p>
        </section>
        <section className="rounded-2xl border border-os-border bg-os-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Resultado esperado</h2>
          <p className="text-sm text-os-muted">{playbook.expectedResult || "Não preenchido."}</p>
        </section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ListBlock title="Pré-requisitos" items={playbook.prerequisites} />
          <ListBlock title="Responsáveis padrão" items={playbook.defaultResponsibles} />
        </div>
      </div>
      <div className="space-y-4">
        <ListBlock title="Documentos necessários" items={playbook.requiredDocuments} />
        <ListBlock title="Entregáveis" items={playbook.deliverables} />
        <ListBlock title="Critérios de sucesso" items={playbook.successCriteria} />
      </div>
    </div>
  );

  const totalBlocks = stages.reduce((sum, s) => sum + s.blocks.length, 0);

  const estrutura = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-os-border bg-os-card p-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-os-muted">
          <span>{stages.length} etapas</span>
          <span>{totalBlocks} blocos</span>
        </div>
        <Link
          href={`/admin/playbooks/${playbook.id}/editor`}
          className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-xs font-bold text-white hover:brightness-110"
        >
          <Wand2 className="h-3.5 w-3.5" /> Abrir Construtor
        </Link>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-os-border bg-os-card/30 p-10 text-center">
          <p className="text-sm font-semibold text-os-ink">Este playbook ainda não possui etapas.</p>
          <p className="mt-1 text-xs text-os-muted">Abra o Construtor para montar as etapas e os blocos operacionais.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="rounded-xl border border-os-border bg-os-card px-4 py-3">
              <p className="text-sm font-bold text-os-ink">
                {index + 1}. {stage.name}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-os-muted">
                {stage.durationValue != null && (
                  <span>
                    {stage.durationValue} {durationUnitLabel(stage.durationUnit)}
                  </span>
                )}
                <span>
                  {stage.blocks.length} {stage.blocks.length === 1 ? "bloco" : "blocos"}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const validacao = playbook.currentVersionId ? (
    <PlaybookValidationPanel playbookId={playbook.id} versionId={playbook.currentVersionId} />
  ) : (
    <div className="rounded-2xl border border-dashed border-os-border bg-os-card/30 p-10 text-center text-sm text-os-muted">
      Abra o Construtor para validar a estrutura do playbook.
    </div>
  );

  const recursos = <ResourcesPanel resources={resources} playbookId={playbook.id} />;
  const versoes = <VersionsPanel versions={versions} currentVersion={playbook.version} currentStatus={playbook.status} />;

  const historico = (
    <div className="space-y-2">
      <div className="rounded-xl border border-os-border bg-os-card px-4 py-3 text-sm text-os-ink">
        Criado em {formatDate(playbook.createdAt)}
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
        Última atualização em {formatDate(playbook.updatedAt)}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={playbook.status} />
            <span className="text-xs font-semibold text-os-muted">v{playbook.version}</span>
          </div>
          <h1 className="text-xl font-black text-os-ink">{playbook.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-os-muted">{playbook.description ?? "Sem descrição."}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-os-muted">
            {product && <span>{product.name}</span>}
            {method && (
              <Link href={`/admin/metodos/${method.id}`} className="hover:text-os-accent">
                {method.name}
              </Link>
            )}
            <span>{playbookTypeLabel(playbook.type)}</span>
            {playbook.defaultDurationDays != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {playbook.defaultDurationDays} dias
              </span>
            )}
            <span>Atualizado {formatDate(playbook.updatedAt)}</span>
          </p>
        </div>
        <PlaybookDetailActions playbookId={playbook.id} status={playbook.status} />
      </div>

      <DetailTabs tabs={TABS} content={{ resumo, estrutura, recursos, validacao, versoes, historico }} />
    </div>
  );
}
