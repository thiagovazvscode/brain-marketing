"use client";

import { useEffect, useRef, useState } from "react";
import type { FocusHint } from "@/components/admin/PlaybookConfigPanel";
import { ArrowLeft, BarChart3, GripVertical, MoreVertical, Plus, Send, ClipboardList, Lock, Users, FileText, Upload } from "lucide-react";
import type {
  PlaybookAnalysisCriterionRow,
  PlaybookAnalysisDimensionRow,
  PlaybookChecklistItemRow,
  PlaybookFormQuestionRow,
  PlaybookStageRow,
  PlaybookBlockRow,
  PlaybookResourceOption,
  SimpleOption,
} from "@/types/methods";
import {
  documentKindLabel,
  documentOriginLabel,
  durationUnitLabel,
  formRespondentTypeLabel,
  meetingDurationUnitLabel,
  meetingFormatLabel,
  playbookAssigneeRoleLabel,
  playbookBlockPriorityLabel,
  playbookBlockTypeLabel,
} from "@/lib/methods";
import { EmptyBlocksPlaceholder } from "@/components/admin/EmptyBlocksPlaceholder";
import { ChecklistBuilder } from "@/components/admin/blocks/ChecklistBuilder";
import { FormBuilder } from "@/components/admin/blocks/FormBuilder";
import { AnalysisBuilder } from "@/components/admin/blocks/AnalysisBuilder";

// Cor discreta por tipo — só em ícone/badge/marca lateral (regra do pedido:
// verde da Brain fica exclusivo de seleção/sucesso).
const TYPE_STYLE: Record<string, { badge: string; chip: string }> = {
  internal_task: { badge: "bg-violet-100 text-violet-700", chip: "bg-violet-100 text-violet-600" },
  client_request: { badge: "bg-blue-100 text-blue-700", chip: "bg-blue-100 text-blue-600" },
  checklist: { badge: "bg-teal-100 text-teal-700", chip: "bg-teal-100 text-teal-600" },
  meeting: { badge: "bg-orange-100 text-orange-700", chip: "bg-orange-100 text-orange-600" },
  form_briefing: { badge: "bg-pink-100 text-pink-700", chip: "bg-pink-100 text-pink-600" },
  document: { badge: "bg-slate-100 text-slate-700", chip: "bg-slate-100 text-slate-600" },
  // Azul-violeta (indigo) discreto — item 1/13 do pedido: nunca usar o verde
  // Brain (reservado a seleção/sucesso) como cor de tipo.
  analysis: { badge: "bg-indigo-100 text-indigo-700", chip: "bg-indigo-100 text-indigo-600" },
};

const TYPE_ICON: Record<string, typeof ClipboardList> = {
  internal_task: ClipboardList,
  client_request: Send,
  checklist: ClipboardList,
  meeting: Users,
  form_briefing: FileText,
  document: Upload,
  analysis: BarChart3,
};

const PRIORITY_DOT: Record<string, string> = {
  baixa: "text-os-muted",
  media: "text-os-muted",
  alta: "text-amber-600",
  critica: "text-red-600",
};

/**
 * Destaque temporário (2s) do construtor de itens/perguntas quando a
 * Validação aponta um problema em "checklist.items"/"form.questions" — esses
 * campos não moram no painel de configuração (coluna direita), moram aqui no
 * centro, então quem escuta o focusHint é este componente, não o painel.
 */
function useBuilderFocus(ref: React.RefObject<HTMLElement | null>, active: boolean, nonce: number | undefined) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-os-accent", "ring-offset-2");
    const timer = setTimeout(() => el.classList.remove("ring-2", "ring-os-accent", "ring-offset-2"), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, nonce]);
}

/** Resumo específico por tipo (item 10 do pedido) — cada tipo mostra o que importa dele, não um due-offset genérico que não se aplica. */
function typeSummary(block: PlaybookBlockRow): string {
  const meta = block.metadata ?? {};
  if (block.type === "meeting") {
    const parts: string[] = [];
    if (meta.format) parts.push(meetingFormatLabel(meta.format as string));
    if (meta.durationValue != null) parts.push(`${meta.durationValue} ${meetingDurationUnitLabel((meta.durationUnit as string) ?? "minutos")}`);
    const participantCount = ((meta.internalParticipantRoles as string[]) ?? []).length + ((meta.clientParticipants as string[]) ?? []).length;
    if (participantCount > 0) parts.push(`${participantCount} participantes`);
    return parts.length > 0 ? ` • ${parts.join(" • ")}` : "";
  }
  if (block.type === "checklist") {
    const required = block.checklistItems.filter((i) => i.isRequired).length;
    return ` • ${block.checklistItems.length} itens • ${required} obrigatórios`;
  }
  if (block.type === "form_briefing") {
    const required = block.formQuestions.filter((q) => q.isRequired).length;
    const respondent = meta.respondentType ? formRespondentTypeLabel(meta.respondentType as string) : null;
    return ` • ${block.formQuestions.length} perguntas • ${required} obrigatórias${respondent ? ` • ${respondent}` : ""}`;
  }
  if (block.type === "analysis") {
    const criteriaCount = block.analysisDimensions.reduce((sum, d) => sum + d.criteria.length, 0);
    return ` • ${block.analysisDimensions.length} ${block.analysisDimensions.length === 1 ? "dimensão" : "dimensões"} • ${criteriaCount} ${criteriaCount === 1 ? "critério" : "critérios"}`;
  }
  if (block.type === "document") {
    const parts: string[] = [];
    if (meta.documentKind) parts.push(documentKindLabel(meta.documentKind as string));
    if (meta.origin) parts.push(documentOriginLabel(meta.origin as string));
    const formats = (meta.acceptedFormats as string[]) ?? [];
    if (formats.length > 0) parts.push(formats.map((f) => f.toUpperCase()).join(", "));
    return parts.length > 0 ? ` • ${parts.join(" • ")}` : "";
  }
  if (block.dueOffsetValue != null) {
    return ` • ${block.dueOffsetValue} ${durationUnitLabel(block.dueOffsetUnit)}`;
  }
  return "";
}

function BlockRow({
  block,
  index,
  isSelected,
  assigneeLabel,
  onSelect,
  onDuplicate,
  onDelete,
  dragProps,
}: {
  block: PlaybookBlockRow;
  index: number;
  isSelected: boolean;
  assigneeLabel: string | null;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = TYPE_ICON[block.type] ?? ClipboardList;
  const style = TYPE_STYLE[block.type] ?? { badge: "bg-os-bg text-os-muted", chip: "bg-os-bg text-os-muted" };

  return (
    <div
      {...dragProps}
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border py-3 pl-4 pr-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-accent ${
        isSelected ? "border-os-accent bg-os-accent-soft/30" : "border-os-border hover:bg-os-bg/60"
      }`}
    >
      {isSelected && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-os-accent" aria-hidden />}

      <div className="flex items-center gap-2.5">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-os-bg text-[10px] font-bold text-os-muted">
          {index + 1}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${style.chip}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-os-ink">{block.title || "Sem título"}</p>
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Mais ações do bloco"
            className="text-os-muted hover:text-os-ink"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-os-border bg-os-card py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <button onClick={onSelect} className="block w-full px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg">
                Editar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg"
              >
                Duplicar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-os-bg"
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="truncate pl-[3.75rem] text-[11px] text-os-muted">
        {playbookBlockTypeLabel(block.type)}
        {assigneeLabel && <> • {assigneeLabel}</>}
        {typeSummary(block)}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-[3.75rem] text-[10px] font-bold">
        <span className={PRIORITY_DOT[block.priority] ?? "text-os-muted"}>{playbookBlockPriorityLabel(block.priority)}</span>
        {block.isRequired && (
          <>
            <span className="text-os-border">|</span>
            <span className="text-os-muted">Obrigatória</span>
          </>
        )}
        {block.blocksStage && (
          <>
            <span className="text-os-border">|</span>
            <span className="flex items-center gap-1 text-os-muted">
              <Lock className="h-2.5 w-2.5" /> Bloqueia conclusão
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function PlaybookStageContent({
  stage,
  totalStages,
  selectedBlockId,
  selectedBlock,
  assigneeOptions,
  onSelectBlock,
  onAddBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onCreateChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onDuplicateChecklistItem,
  onReorderChecklistItems,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onReorderQuestions,
  formQuestionError,
  onCreateDimension,
  onUpdateDimension,
  onDuplicateDimension,
  onDeleteDimension,
  onReorderDimensions,
  onCreateCriterion,
  onUpdateCriterion,
  onDuplicateCriterion,
  onDeleteCriterion,
  onReorderCriteria,
  analysisCriterionError,
  onUpdateBlockMetadata,
  resourceOptions,
  onBack,
  focusHint,
}: {
  stage: PlaybookStageRow | null;
  totalStages: number;
  selectedBlockId: string | null;
  selectedBlock: PlaybookBlockRow | null;
  assigneeOptions: SimpleOption[];
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (orderedIds: string[]) => void;
  onCreateChecklistItem: (blockId: string) => void;
  onUpdateChecklistItem: (blockId: string, itemId: string, patch: Partial<PlaybookChecklistItemRow>) => void;
  onDeleteChecklistItem: (blockId: string, itemId: string) => void;
  onDuplicateChecklistItem: (blockId: string, item: PlaybookChecklistItemRow) => void;
  onReorderChecklistItems: (blockId: string, orderedIds: string[]) => void;
  onCreateQuestion: (blockId: string) => void;
  onUpdateQuestion: (blockId: string, questionId: string, patch: Partial<PlaybookFormQuestionRow>) => void;
  onDeleteQuestion: (blockId: string, questionId: string) => void;
  onDuplicateQuestion: (blockId: string, question: PlaybookFormQuestionRow) => void;
  onReorderQuestions: (blockId: string, orderedIds: string[]) => void;
  formQuestionError?: string | null;
  onCreateDimension: (blockId: string, name: string) => void;
  onUpdateDimension: (blockId: string, dimensionId: string, patch: Record<string, unknown>) => void;
  onDuplicateDimension: (blockId: string, dimension: PlaybookAnalysisDimensionRow) => void;
  onDeleteDimension: (blockId: string, dimensionId: string) => void;
  onReorderDimensions: (blockId: string, orderedIds: string[]) => void;
  onCreateCriterion: (blockId: string, dimensionId: string, name: string) => void;
  onUpdateCriterion: (blockId: string, dimensionId: string, criterionId: string, patch: Record<string, unknown>) => void;
  onDuplicateCriterion: (blockId: string, dimensionId: string, criterion: PlaybookAnalysisCriterionRow) => void;
  onDeleteCriterion: (blockId: string, dimensionId: string, criterionId: string) => void;
  onReorderCriteria: (blockId: string, dimensionId: string, orderedIds: string[]) => void;
  analysisCriterionError?: string | null;
  onUpdateBlockMetadata: (blockId: string, patch: Record<string, unknown>) => void;
  resourceOptions: PlaybookResourceOption[];
  onBack: () => void;
  focusHint?: FocusHint | null;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const checklistRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  useBuilderFocus(checklistRef, focusHint?.field === "checklist.items", focusHint?.nonce);
  useBuilderFocus(formRef, focusHint?.field === "form.questions", focusHint?.nonce);
  useBuilderFocus(analysisRef, Boolean(focusHint?.field?.startsWith("analysis.")), focusHint?.nonce);

  if (!stage) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-os-border bg-os-card/40 p-10 text-center text-sm text-os-muted">
        Selecione uma etapa para ver seu conteúdo.
      </div>
    );
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId || !stage) {
      setDraggingId(null);
      return;
    }
    const ids = stage.blocks.map((b) => b.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorderBlocks(ids);
  }

  function assigneeLabel(block: PlaybookBlockRow): string | null {
    if (block.assigneeType === "usuario_especifico") {
      return block.defaultAssigneeId ? assigneeOptions.find((a) => a.id === block.defaultAssigneeId)?.name ?? null : null;
    }
    if (block.assigneeType === "papel_padrao") {
      return block.defaultAssigneeRole ? playbookAssigneeRoleLabel(block.defaultAssigneeRole) : null;
    }
    return "A definir ao aplicar";
  }

  // Checklist/Formulário selecionado: o centro vira o construtor de itens/
  // perguntas (item 11 do pedido — "centro: itens; direita: config geral"),
  // não a lista de blocos. "← Voltar" desseleciona pra reaparecer a lista.
  if (selectedBlock?.type === "checklist") {
    return (
      <div ref={checklistRef} className="min-w-0 flex-1 space-y-3 rounded-2xl">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para blocos
        </button>
        <ChecklistBuilder
          items={selectedBlock.checklistItems}
          onCreate={() => onCreateChecklistItem(selectedBlock.id)}
          onUpdate={(itemId, patch) => onUpdateChecklistItem(selectedBlock.id, itemId, patch)}
          onDelete={(itemId) => onDeleteChecklistItem(selectedBlock.id, itemId)}
          onDuplicate={(item) => onDuplicateChecklistItem(selectedBlock.id, item)}
          onReorder={(orderedIds) => onReorderChecklistItems(selectedBlock.id, orderedIds)}
        />
      </div>
    );
  }
  if (selectedBlock?.type === "form_briefing") {
    return (
      <div ref={formRef} className="min-w-0 flex-1 space-y-3 rounded-2xl">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para blocos
        </button>
        <FormBuilder
          questions={selectedBlock.formQuestions}
          onCreate={() => onCreateQuestion(selectedBlock.id)}
          onUpdate={(questionId, patch) => onUpdateQuestion(selectedBlock.id, questionId, patch)}
          onDelete={(questionId) => onDeleteQuestion(selectedBlock.id, questionId)}
          onDuplicate={(question) => onDuplicateQuestion(selectedBlock.id, question)}
          onReorder={(orderedIds) => onReorderQuestions(selectedBlock.id, orderedIds)}
          error={formQuestionError}
        />
      </div>
    );
  }
  if (selectedBlock?.type === "analysis") {
    return (
      <div ref={analysisRef} className="min-w-0 flex-1 space-y-3 rounded-2xl">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para blocos
        </button>
        <AnalysisBuilder
          block={selectedBlock}
          siblingBlocks={stage.blocks.filter((b) => b.id !== selectedBlock.id)}
          resourceOptions={resourceOptions}
          criterionError={analysisCriterionError}
          onCreateDimension={(name) => onCreateDimension(selectedBlock.id, name)}
          onUpdateDimension={(dimensionId, patch) => onUpdateDimension(selectedBlock.id, dimensionId, patch)}
          onDuplicateDimension={(dimension) => onDuplicateDimension(selectedBlock.id, dimension)}
          onDeleteDimension={(dimensionId) => onDeleteDimension(selectedBlock.id, dimensionId)}
          onReorderDimensions={(orderedIds) => onReorderDimensions(selectedBlock.id, orderedIds)}
          onCreateCriterion={(dimensionId, name) => onCreateCriterion(selectedBlock.id, dimensionId, name)}
          onUpdateCriterion={(dimensionId, criterionId, patch) => onUpdateCriterion(selectedBlock.id, dimensionId, criterionId, patch)}
          onDuplicateCriterion={(dimensionId, criterion) => onDuplicateCriterion(selectedBlock.id, dimensionId, criterion)}
          onDeleteCriterion={(dimensionId, criterionId) => onDeleteCriterion(selectedBlock.id, dimensionId, criterionId)}
          onReorderCriteria={(dimensionId, orderedIds) => onReorderCriteria(selectedBlock.id, dimensionId, orderedIds)}
          onUpdateMetadata={(patch) => onUpdateBlockMetadata(selectedBlock.id, patch)}
          focusHint={focusHint}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-os-muted">
            Etapa {stage.position + 1} de {totalStages}
          </p>
          <h2 className="text-lg font-black text-os-ink">{stage.name || "Sem nome"}</h2>
          {stage.objective && <p className="mt-1 text-sm text-os-muted">{stage.objective}</p>}
        </div>
        {stage.durationValue != null && (
          <span className="shrink-0 rounded-full border border-os-border px-2.5 py-1 text-[11px] font-bold text-os-muted">
            {stage.durationValue} {durationUnitLabel(stage.durationUnit)}
          </span>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-os-ink">Blocos da Etapa</h3>
        <button
          onClick={onAddBlock}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar bloco
        </button>
      </div>

      {stage.blocks.length === 0 ? (
        <EmptyBlocksPlaceholder onAddInternalTask={onAddBlock} onAddClientRequest={onAddBlock} />
      ) : (
        <div className="flex flex-col gap-2">
          {stage.blocks.map((block, index) => (
            <BlockRow
              key={block.id}
              block={block}
              index={index}
              isSelected={block.id === selectedBlockId}
              assigneeLabel={assigneeLabel(block)}
              onSelect={() => onSelectBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
              dragProps={{
                draggable: true,
                onDragStart: () => setDraggingId(block.id),
                onDragOver: (e) => e.preventDefault(),
                onDrop: () => handleDrop(block.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
