"use client";

import { ClipboardList, FileText, Send, Upload, Users, X } from "lucide-react";
import type { PlaybookBlockRow, PlaybookStageRow, SimpleOption } from "@/types/methods";
import {
  documentCategoryLabel,
  documentKindLabel,
  documentOriginLabel,
  documentVisibilityLabel,
  durationUnitLabel,
  formRespondentTypeLabel,
  meetingDurationUnitLabel,
  meetingFormatLabel,
  playbookAssigneeRoleLabel,
  playbookBlockTypeLabel,
  formQuestionTypeLabel,
} from "@/lib/methods";

// Ícone + cor discreta por tipo — só pra diferenciar rapidamente na
// pré-visualização (refinamento visual, mesma paleta do BlockTypePicker/
// PlaybookStageContent). Sem impacto funcional, sem novo dado.
const TYPE_CHIP: Record<string, string> = {
  internal_task: "bg-violet-100 text-violet-600",
  client_request: "bg-blue-100 text-blue-600",
  checklist: "bg-teal-100 text-teal-600",
  meeting: "bg-orange-100 text-orange-600",
  form_briefing: "bg-pink-100 text-pink-600",
  document: "bg-slate-100 text-slate-600",
};
const TYPE_ICON: Record<string, typeof ClipboardList> = {
  internal_task: ClipboardList,
  client_request: Send,
  checklist: ClipboardList,
  meeting: Users,
  form_briefing: FileText,
  document: Upload,
};

function assigneeSummary(block: PlaybookBlockRow, assigneeOptions: SimpleOption[]): string | null {
  if (block.assigneeType === "usuario_especifico") {
    return block.defaultAssigneeId ? assigneeOptions.find((a) => a.id === block.defaultAssigneeId)?.name ?? null : null;
  }
  if (block.assigneeType === "papel_padrao") {
    return block.defaultAssigneeRole ? playbookAssigneeRoleLabel(block.defaultAssigneeRole) : null;
  }
  return "A definir ao aplicar";
}

// Detalhe somente leitura por tipo (item 13 do pedido) — nunca simula que a
// reunião aconteceu, o formulário foi respondido ou o checklist concluído;
// só representa como vai aparecer quando isso existir de verdade (Fase 3/4).
function BlockPreviewDetail({ block, assigneeOptions }: { block: PlaybookBlockRow; assigneeOptions: SimpleOption[] }) {
  const meta = (block.metadata ?? {}) as Record<string, unknown>;
  const responsible = assigneeSummary(block, assigneeOptions);

  if (block.type === "meeting") {
    return (
      <div className="mt-1.5 space-y-1 text-[11px] text-os-muted">
        {meta.objective != null && <p>Objetivo: {String(meta.objective)}</p>}
        <p>
          {meta.format ? meetingFormatLabel(meta.format as string) : "Formato a definir"}
          {meta.durationValue != null ? ` • ${meta.durationValue} ${meetingDurationUnitLabel((meta.durationUnit as string) ?? "minutos")}` : ""}
          {responsible ? ` • ${responsible}` : ""}
        </p>
        {((meta.internalParticipantRoles as string[] | undefined)?.length || (meta.clientParticipants as string[] | undefined)?.length) ? (
          <p>Participantes: {[...(meta.internalParticipantRoles as string[] | undefined) ?? [], ...(meta.clientParticipants as string[] | undefined) ?? []].join(", ")}</p>
        ) : null}
        {(meta.agenda as string[] | undefined)?.length ? <p>Pauta: {(meta.agenda as string[]).join("; ")}</p> : null}
        {block.expectedResult && <p>Resultado esperado: {block.expectedResult}</p>}
        {block.completionCriteria && <p>Critério de conclusão: {block.completionCriteria}</p>}
        <p className="mt-1.5 border-t border-dashed border-os-border/50 pt-1.5 italic text-os-muted/70">Reunião ainda não agendada.</p>
      </div>
    );
  }

  if (block.type === "checklist") {
    const required = block.checklistItems.filter((i) => i.isRequired).length;
    const groups = [...new Set(block.checklistItems.map((i) => i.groupName).filter(Boolean))] as string[];
    return (
      <div className="mt-1.5 space-y-1 text-[11px] text-os-muted">
        <p>
          {responsible ? `${responsible} • ` : ""}
          {block.checklistItems.length} itens • {required} obrigatórios
        </p>
        {groups.length > 0 && <p>Grupos: {groups.join(", ")}</p>}
        {block.checklistItems.length > 0 && (
          <ul className="ml-3 list-disc space-y-0.5">
            {block.checklistItems.map((item) => (
              <li key={item.id}>
                {item.title} {item.isRequired && <span className="font-semibold text-os-accent">•</span>}
              </li>
            ))}
          </ul>
        )}
        {block.completionCriteria && <p>Critério de conclusão: {block.completionCriteria}</p>}
        <p className="mt-1.5 border-t border-dashed border-os-border/50 pt-1.5 italic text-os-muted/70">0 de {block.checklistItems.length} concluídos.</p>
      </div>
    );
  }

  if (block.type === "form_briefing") {
    const required = block.formQuestions.filter((q) => q.isRequired).length;
    const sections = [...new Set(block.formQuestions.map((q) => q.sectionName).filter(Boolean))] as string[];
    return (
      <div className="mt-1.5 space-y-1 text-[11px] text-os-muted">
        {meta.introduction != null && <p>{String(meta.introduction)}</p>}
        <p>
          {meta.respondentType ? formRespondentTypeLabel(meta.respondentType as string) : "Respondente a definir"} • {block.formQuestions.length} perguntas • {required} obrigatórias
        </p>
        {sections.length > 0 && <p>Seções: {sections.join(", ")}</p>}
        {block.formQuestions.length > 0 && (
          <ul className="ml-3 list-disc space-y-0.5">
            {block.formQuestions.map((q) => (
              <li key={q.id}>
                {q.label} <span className="text-os-muted/70">({formQuestionTypeLabel(q.questionType)})</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 border-t border-dashed border-os-border/50 pt-1.5 italic text-os-muted/70">0 de {block.formQuestions.length} respostas.</p>
      </div>
    );
  }

  if (block.type === "document") {
    const formats = (meta.acceptedFormats as string[] | undefined) ?? [];
    return (
      <div className="mt-1.5 space-y-1 text-[11px] text-os-muted">
        <p>
          {meta.documentKind ? documentKindLabel(meta.documentKind as string) : "Tipo a definir"}
          {meta.origin ? ` • ${documentOriginLabel(meta.origin as string)}` : ""}
          {meta.category ? ` • ${documentCategoryLabel(meta.category as string)}` : ""}
        </p>
        {block.description && <p>{block.description}</p>}
        {formats.length > 0 && <p>Formatos: {formats.map((f) => f.toUpperCase()).join(", ")}</p>}
        <p>
          {responsible ? `${responsible} • ` : ""}
          {meta.requiresApproval ? "Exige aprovação" : "Sem aprovação obrigatória"}
          {meta.visibility ? ` • ${documentVisibilityLabel(meta.visibility as string)}` : ""}
        </p>
        {block.completionCriteria && <p>Critério de conclusão: {block.completionCriteria}</p>}
        <p className="mt-1.5 border-t border-dashed border-os-border/50 pt-1.5 italic text-os-muted/70">Documento ainda não recebido.</p>
      </div>
    );
  }

  return null;
}

// Somente leitura — não confundir com aplicação a um cliente (Etapa 3).
export function PlaybookPreview({
  playbookName,
  version,
  stages,
  assigneeOptions,
  onClose,
}: {
  playbookName: string;
  version: string;
  stages: PlaybookStageRow[];
  assigneeOptions: SimpleOption[];
  onClose: () => void;
}) {
  const totalDuration = stages.reduce((sum, s) => sum + (s.durationValue ?? 0), 0);
  const totalBlocks = stages.reduce((sum, s) => sum + s.blocks.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Pré-visualização de ${playbookName}`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-os-ink">{playbookName}</h3>
            <p className="text-xs text-os-muted">Versão {version} · Pré-visualização somente leitura</p>
          </div>
          <button onClick={onClose} aria-label="Fechar pré-visualização" className="text-os-muted hover:text-os-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-os-muted">
          <span>{stages.length} etapas</span>
          <span>{totalBlocks} blocos</span>
          <span>{totalDuration} dias úteis (aprox.)</span>
        </div>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="rounded-xl border border-os-border p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-os-muted">Etapa {index + 1}</p>
                  <p className="text-sm font-bold text-os-ink">{stage.name}</p>
                  {stage.objective && <p className="mt-0.5 text-xs text-os-muted">{stage.objective}</p>}
                </div>
                {stage.durationValue != null && (
                  <span className="shrink-0 rounded-full border border-os-border px-2 py-0.5 text-[11px] font-semibold text-os-muted">
                    {stage.durationValue} {durationUnitLabel(stage.durationUnit)}
                  </span>
                )}
              </div>
              {stage.blocks.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {stage.blocks.map((block) => {
                    const Icon = TYPE_ICON[block.type] ?? ClipboardList;
                    const chip = TYPE_CHIP[block.type] ?? "bg-os-bg text-os-muted";
                    return (
                      <li key={block.id} className="rounded-lg bg-os-bg/60 px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${chip}`}>
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="font-semibold text-os-ink">{block.title}</span>
                          <span className="text-os-muted">{playbookBlockTypeLabel(block.type)}</span>
                          {block.dueOffsetValue != null && (
                            <span className="text-os-muted">
                              +{block.dueOffsetValue} {durationUnitLabel(block.dueOffsetUnit)}
                            </span>
                          )}
                          {block.isRequired && <span className="font-semibold text-os-accent">Obrigatória</span>}
                        </div>
                        <BlockPreviewDetail block={block} assigneeOptions={assigneeOptions} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
