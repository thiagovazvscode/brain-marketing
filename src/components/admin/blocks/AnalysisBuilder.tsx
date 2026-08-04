"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
  Archive,
  ArchiveRestore,
  ClipboardList,
  Send,
  CheckSquare,
  Users,
  FileText,
  Upload,
  BookOpen,
  Link2,
} from "lucide-react";
import type {
  AnalysisBlockMetadata,
  AnalysisSourceLink,
  PlaybookAnalysisCriterionRow,
  PlaybookAnalysisDimensionRow,
  PlaybookBlockRow,
  PlaybookResourceOption,
} from "@/types/methods";
import {
  ANALYSIS_EVALUATION_TYPES,
  ANALYSIS_EVALUATION_TYPES_WITH_OPTIONS,
  ANALYSIS_SOURCE_TYPES,
  ANALYSIS_CLASSIFICATION_DEFAULT_OPTIONS,
  analysisEvaluationTypeLabel,
  analysisSourceTypeLabel,
} from "@/lib/methods";
import { Switch } from "@/components/admin/Switch";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ListFieldEditor } from "@/components/admin/blocks/ListFieldEditor";
import type { FocusHint } from "@/components/admin/PlaybookConfigPanel";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-2.5 py-1.5 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-os-muted";

const TABS = [
  { id: "dimensions", label: "Dimensões" },
  { id: "criteria", label: "Critérios" },
  { id: "sources", label: "Fontes de informação" },
  { id: "conclusions", label: "Conclusões e recomendações" },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface Props {
  block: PlaybookBlockRow;
  siblingBlocks: PlaybookBlockRow[];
  resourceOptions: PlaybookResourceOption[];
  criterionError?: string | null;
  onCreateDimension: (name: string) => void;
  onUpdateDimension: (dimensionId: string, patch: Record<string, unknown>) => void;
  onDuplicateDimension: (dimension: PlaybookAnalysisDimensionRow) => void;
  onDeleteDimension: (dimensionId: string) => void;
  onReorderDimensions: (orderedIds: string[]) => void;
  onCreateCriterion: (dimensionId: string, name: string) => void;
  onUpdateCriterion: (dimensionId: string, criterionId: string, patch: Record<string, unknown>) => void;
  onDuplicateCriterion: (dimensionId: string, criterion: PlaybookAnalysisCriterionRow) => void;
  onDeleteCriterion: (dimensionId: string, criterionId: string) => void;
  onReorderCriteria: (dimensionId: string, orderedIds: string[]) => void;
  onUpdateMetadata: (patch: Record<string, unknown>) => void;
  focusHint?: FocusHint | null;
}

function dimensionSummary(dimension: PlaybookAnalysisDimensionRow): string {
  const parts: string[] = [];
  if (dimension.weight != null) parts.push(`Peso ${dimension.weight}%`);
  parts.push(`${dimension.criteria.length} ${dimension.criteria.length === 1 ? "critério" : "critérios"}`);
  parts.push(dimension.isActive ? "Ativa" : "Arquivada");
  return parts.join(" · ");
}

function criterionSummary(criterion: PlaybookAnalysisCriterionRow): string {
  const parts: string[] = [analysisEvaluationTypeLabel(criterion.evaluationType) ?? criterion.evaluationType];
  if (criterion.weight != null) parts.push(`Peso ${criterion.weight}%`);
  parts.push(criterion.isRequired ? "Obrigatório" : "Opcional");
  if (criterion.requiresEvidence) parts.push("Exige evidência");
  return parts.join(" · ");
}

function CriterionRow({
  criterion,
  index,
  expanded,
  onExpand,
  onCollapse,
  onUpdate,
  onDuplicate,
  onRequestDelete,
  dragProps,
  isDropTarget,
}: {
  criterion: PlaybookAnalysisCriterionRow;
  index: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onUpdate: (patch: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  isDropTarget?: boolean;
}) {
  const [name, setName] = useState(criterion.name);
  const [description, setDescription] = useState(criterion.description ?? "");
  const [evidenceDescription, setEvidenceDescription] = useState(criterion.evidenceDescription ?? "");
  const [guidance, setGuidance] = useState(criterion.guidance ?? "");
  // Peso local até o blur — igual a name/description acima. Disparar
  // onUpdate a cada dígito (como estava antes) manda um PATCH por
  // keystroke; dois PATCHes concorrentes (ex.: "3" e "30") podem responder
  // fora de ordem e o refetch aplica o que chegou por último, não o que foi
  // digitado por último — silenciosamente salva um peso errado.
  const [weightDraft, setWeightDraft] = useState(criterion.weight != null ? String(criterion.weight) : "");
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [pendingOptions, setPendingOptions] = useState<string[]>(criterion.options);
  const effectiveType = pendingType ?? criterion.evaluationType;
  const needsOptions = ANALYSIS_EVALUATION_TYPES_WITH_OPTIONS.includes(effectiveType as never);
  const isPending = pendingType !== null && pendingType !== criterion.evaluationType;

  if (!expanded) {
    return (
      <div
        {...dragProps}
        className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors duration-150 ${
          isDropTarget ? "border-os-accent bg-os-accent-soft" : "border-os-border bg-os-card"
        }`}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-os-muted/50" />
        <span className="w-4 shrink-0 text-[11px] font-bold text-os-muted">{index + 1}.</span>
        <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-expanded={false}>
          <p className="truncate text-xs font-semibold text-os-ink">{criterion.name || "Critério sem nome"}</p>
          <p className="truncate text-[10px] text-os-muted">{criterionSummary(criterion)}</p>
        </button>
        <button onClick={onDuplicate} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Duplicar critério">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={onRequestDelete} className="shrink-0 text-os-muted hover:text-red-600" aria-label="Excluir critério">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onExpand} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Expandir critério">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  function handleTypeChange(newType: string) {
    const needsOpts = ANALYSIS_EVALUATION_TYPES_WITH_OPTIONS.includes(newType as never);
    if (!needsOpts) {
      setPendingType(null);
      onUpdate({ evaluationType: newType });
      return;
    }
    setPendingType(newType);
    setPendingOptions(criterion.options.length > 0 ? criterion.options : ANALYSIS_CLASSIFICATION_DEFAULT_OPTIONS);
  }

  function handleOptionsChange(values: string[]) {
    setPendingOptions(values);
    const cleaned = values.map((v) => v.trim()).filter(Boolean);
    if (cleaned.length < 2) return;
    if (isPending) {
      onUpdate({ evaluationType: pendingType!, options: values });
      setPendingType(null);
    } else {
      onUpdate({ options: values });
    }
  }

  return (
    <div {...dragProps} className="rounded-lg border border-os-accent/40 bg-os-card p-2.5">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1.5 h-3.5 w-3.5 shrink-0 cursor-grab text-os-muted/50" />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== criterion.name && onUpdate({ name: name.trim() })}
            placeholder="Nome do critério"
            className={`${inputClass} font-semibold`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (criterion.description ?? "") && onUpdate({ description: description.trim() || null })}
            placeholder="Descrição (opcional)"
            rows={2}
            className={`${inputClass} resize-none text-xs`}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Tipo de avaliação</label>
              <select value={effectiveType} onChange={(e) => handleTypeChange(e.target.value)} className={inputClass}>
                {ANALYSIS_EVALUATION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Peso (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={weightDraft}
                onChange={(e) => setWeightDraft(e.target.value)}
                onBlur={() => {
                  const current = criterion.weight != null ? String(criterion.weight) : "";
                  if (weightDraft === current) return;
                  onUpdate({ weight: weightDraft === "" ? null : Number(weightDraft) });
                }}
                className={inputClass}
              />
            </div>
          </div>
          {needsOptions && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-os-muted">Opções (mín. 2)</p>
              <ListFieldEditor values={pendingOptions} onChange={handleOptionsChange} placeholder="Adicionar opção" />
              {isPending && pendingOptions.map((v) => v.trim()).filter(Boolean).length < 2 && (
                <p className="mt-1 text-[11px] text-os-muted">Adicione ao menos duas opções para salvar este tipo.</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Switch checked={criterion.isRequired} onChange={(v) => onUpdate({ isRequired: v })} label="Obrigatório" />
            <Switch checked={criterion.requiresEvidence} onChange={(v) => onUpdate({ requiresEvidence: v })} label="Exige evidência" />
            <Switch checked={criterion.isActive} onChange={(v) => onUpdate({ isActive: v })} label="Ativo" />
          </div>
          {criterion.requiresEvidence && (
            <textarea
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              onBlur={() => evidenceDescription !== (criterion.evidenceDescription ?? "") && onUpdate({ evidenceDescription: evidenceDescription.trim() || null })}
              placeholder="Evidência esperada (ex: print, planilha, relatório)"
              rows={2}
              className={`${inputClass} resize-none text-xs`}
            />
          )}
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            onBlur={() => guidance !== (criterion.guidance ?? "") && onUpdate({ guidance: guidance.trim() || null })}
            placeholder="Orientação interna para quem avaliar (opcional)"
            rows={2}
            className={`${inputClass} resize-none text-xs`}
          />
          <div className="flex items-center justify-between border-t border-os-border pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onDuplicate} className="flex items-center gap-1 text-[11px] font-bold text-os-muted hover:text-os-ink">
                <Copy className="h-3 w-3" /> Duplicar
              </button>
              <button onClick={onRequestDelete} className="flex items-center gap-1 text-[11px] font-bold text-os-muted hover:text-red-600">
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            </div>
            <button onClick={onCollapse} className="flex items-center gap-1 text-[11px] font-bold text-os-muted hover:text-os-ink">
              Recolher <ChevronUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CriteriaList({
  dimension,
  expandedCriterionId,
  setExpandedCriterionId,
  onCreateCriterion,
  onUpdateCriterion,
  onDuplicateCriterion,
  onDeleteCriterion,
  onReorderCriteria,
}: {
  dimension: PlaybookAnalysisDimensionRow;
  expandedCriterionId: string | null;
  setExpandedCriterionId: (id: string | null) => void;
  onCreateCriterion: (dimensionId: string, name: string) => void;
  onUpdateCriterion: (dimensionId: string, criterionId: string, patch: Record<string, unknown>) => void;
  onDuplicateCriterion: (dimensionId: string, criterion: PlaybookAnalysisCriterionRow) => void;
  onDeleteCriterion: (dimensionId: string, criterionId: string) => void;
  onReorderCriteria: (dimensionId: string, orderedIds: string[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookAnalysisCriterionRow | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = dimension.criteria.map((c) => c.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorderCriteria(dimension.id, ids);
  }

  function requestDelete(criterion: PlaybookAnalysisCriterionRow) {
    if (criterion.description || criterion.guidance || criterion.requiresEvidence) {
      setDeleteTarget(criterion);
    } else {
      onDeleteCriterion(dimension.id, criterion.id);
    }
  }

  return (
    <div className="space-y-2 border-t border-os-border/70 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-os-muted">Critérios</p>
        {expandedCriterionId && (
          <button onClick={() => setExpandedCriterionId(null)} className="text-[11px] font-bold text-os-muted hover:text-os-ink">
            Recolher critérios
          </button>
        )}
      </div>

      {dimension.criteria.length === 0 ? (
        <p className="rounded-lg border border-dashed border-os-border bg-os-bg/30 p-3 text-center text-xs text-os-muted">
          Nenhum critério ainda.
        </p>
      ) : (
        <div className="space-y-1.5">
          {dimension.criteria.map((criterion, index) => {
            const dragProps = {
              draggable: true,
              onDragStart: () => setDraggingId(criterion.id),
              onDragEnter: () => draggingId && draggingId !== criterion.id && setDragOverId(criterion.id),
              onDragOver: (e: React.DragEvent) => e.preventDefault(),
              onDragEnd: () => {
                setDraggingId(null);
                setDragOverId(null);
              },
              onDrop: () => handleDrop(criterion.id),
            };
            return (
              <CriterionRow
                key={criterion.id}
                criterion={criterion}
                index={index}
                expanded={criterion.id === expandedCriterionId}
                isDropTarget={dragOverId === criterion.id}
                onExpand={() => setExpandedCriterionId(criterion.id)}
                onCollapse={() => setExpandedCriterionId(null)}
                onUpdate={(patch) => onUpdateCriterion(dimension.id, criterion.id, patch)}
                onDuplicate={() => onDuplicateCriterion(dimension.id, criterion)}
                onRequestDelete={() => requestDelete(criterion)}
                dragProps={dragProps}
              />
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nameDraft.trim()) {
              e.preventDefault();
              onCreateCriterion(dimension.id, nameDraft.trim());
              setNameDraft("");
            }
          }}
          placeholder="Nome do novo critério"
          className={inputClass}
        />
        <button
          onClick={() => {
            if (!nameDraft.trim()) return;
            onCreateCriterion(dimension.id, nameDraft.trim());
            setNameDraft("");
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-os-border px-2.5 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar critério
        </button>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={`Excluir "${deleteTarget.name}"?`}
          description="Este critério já tem configuração preenchida. A operação afeta somente o rascunho."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            onDeleteCriterion(dimension.id, deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function DimensionCard({
  dimension,
  index,
  expanded,
  onExpand,
  onCollapse,
  expandedCriterionId,
  setExpandedCriterionId,
  onUpdate,
  onDuplicate,
  onRequestDelete,
  dragProps,
  isDropTarget,
  ...criteriaHandlers
}: {
  dimension: PlaybookAnalysisDimensionRow;
  index: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  expandedCriterionId: string | null;
  setExpandedCriterionId: (id: string | null) => void;
  onUpdate: (patch: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  isDropTarget?: boolean;
  onCreateCriterion: (dimensionId: string, name: string) => void;
  onUpdateCriterion: (dimensionId: string, criterionId: string, patch: Record<string, unknown>) => void;
  onDuplicateCriterion: (dimensionId: string, criterion: PlaybookAnalysisCriterionRow) => void;
  onDeleteCriterion: (dimensionId: string, criterionId: string) => void;
  onReorderCriteria: (dimensionId: string, orderedIds: string[]) => void;
}) {
  const [name, setName] = useState(dimension.name);
  const [description, setDescription] = useState(dimension.description ?? "");
  // Mesmo raciocínio do peso em CriterionRow — local até o blur, nunca um
  // PATCH por keystroke.
  const [weightDraft, setWeightDraft] = useState(dimension.weight != null ? String(dimension.weight) : "");

  if (!expanded) {
    return (
      <div
        {...dragProps}
        className={`flex items-center gap-2 rounded-xl border p-3 transition-colors duration-150 ${
          isDropTarget ? "border-os-accent bg-os-accent-soft" : "border-os-border bg-os-card"
        }`}
      >
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <span className="w-5 shrink-0 text-xs font-bold text-os-muted">{index + 1}.</span>
        <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-expanded={false}>
          <p className="truncate text-sm font-semibold text-os-ink">{dimension.name || "Dimensão sem nome"}</p>
          <p className="truncate text-[11px] text-os-muted">{dimensionSummary(dimension)}</p>
        </button>
        <button onClick={onDuplicate} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Duplicar dimensão">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button onClick={onRequestDelete} className="shrink-0 text-os-muted hover:text-red-600" aria-label="Excluir dimensão">
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={onExpand} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Expandir dimensão">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div {...dragProps} className="rounded-xl border border-os-accent/40 bg-os-card p-3">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== dimension.name && onUpdate({ name: name.trim() })}
            placeholder="Nome da dimensão"
            className={`${inputClass} font-semibold`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (dimension.description ?? "") && onUpdate({ description: description.trim() || null })}
            placeholder="Descrição (opcional)"
            rows={2}
            className={`${inputClass} resize-none text-xs`}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Peso (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={weightDraft}
                onChange={(e) => setWeightDraft(e.target.value)}
                onBlur={() => {
                  const current = dimension.weight != null ? String(dimension.weight) : "";
                  if (weightDraft === current) return;
                  onUpdate({ weight: weightDraft === "" ? null : Number(weightDraft) });
                }}
                className={inputClass}
              />
            </div>
            <div className="flex items-end pb-1.5">
              <Switch checked={dimension.isActive} onChange={(v) => onUpdate({ isActive: v })} label="Ativa" />
            </div>
          </div>

          <CriteriaList
            dimension={dimension}
            expandedCriterionId={expandedCriterionId}
            setExpandedCriterionId={setExpandedCriterionId}
            {...criteriaHandlers}
          />

          <div className="flex items-center justify-between border-t border-os-border pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onDuplicate} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
                <Copy className="h-3.5 w-3.5" /> Duplicar dimensão
              </button>
              <button onClick={onRequestDelete} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Excluir dimensão
              </button>
              <button
                onClick={() => onUpdate({ isActive: !dimension.isActive })}
                className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink"
              >
                {dimension.isActive ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                {dimension.isActive ? "Arquivar" : "Reativar"}
              </button>
            </div>
            <button onClick={onCollapse} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
              Recolher <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalysisBuilder({
  block,
  siblingBlocks,
  resourceOptions,
  criterionError,
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
  onUpdateMetadata,
  focusHint,
}: Props) {
  const [tab, setTab] = useState<TabId>("dimensions");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookAnalysisDimensionRow | null>(null);
  const [expandedDimensionId, setExpandedDimensionId] = useState<string | null>(null);
  const [expandedCriterionId, setExpandedCriterionId] = useState<string | null>(null);
  const [dimensionDraft, setDimensionDraft] = useState("");

  // Navegação a partir de um problema da Validação — "ajustar estado a
  // partir de props durante a renderização" (padrão recomendado pelo React
  // pra isto), mesmo raciocínio do forceOpen em CollapsibleFieldGroup
  // (PlaybookConfigPanel.tsx): abre a aba Dimensões e expande a
  // dimensão/critério certos, sem usar useEffect pra evitar cascata de
  // renders.
  const [appliedFocusNonce, setAppliedFocusNonce] = useState<number | undefined>(undefined);
  if (focusHint?.dimensionId && focusHint.nonce !== appliedFocusNonce) {
    setAppliedFocusNonce(focusHint.nonce);
    setTab("dimensions");
    setExpandedDimensionId(focusHint.dimensionId);
    setExpandedCriterionId(focusHint.criterionId ?? null);
  }

  const dimensions = block.analysisDimensions;
  const meta = (block.metadata ?? {}) as AnalysisBlockMetadata;
  const useWeights = Boolean(meta.useWeights);
  const weightSum = dimensions.reduce((sum, d) => sum + (d.weight ?? 0), 0);
  const dimensionsWithWeight = dimensions.filter((d) => d.weight != null).length;

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = dimensions.map((d) => d.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorderDimensions(ids);
  }

  function requestDelete(dimension: PlaybookAnalysisDimensionRow) {
    if (dimension.description || dimension.criteria.length > 0) {
      setDeleteTarget(dimension);
    } else {
      onDeleteDimension(dimension.id);
    }
  }

  const criteriaHandlers = { onCreateCriterion, onUpdateCriterion, onDuplicateCriterion, onDeleteCriterion, onReorderCriteria };

  return (
    <div className="min-w-0 flex-1 space-y-3 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-os-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === t.id ? "bg-os-accent-soft text-os-accent" : "text-os-muted hover:bg-os-bg hover:text-os-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {criterionError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{criterionError}</p>}

      {tab === "dimensions" && (
        <div className="space-y-3">
          {useWeights && dimensions.length > 0 && (
            <p className="rounded-lg bg-os-warning-soft px-3 py-2 text-[11px] font-semibold text-os-warning">
              {dimensionsWithWeight === 0
                ? "Nenhuma dimensão tem peso definido ainda."
                : `Os pesos das dimensões somam ${weightSum}%. O recomendado é atingir 100% antes da publicação.`}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-os-ink">Dimensões da Análise</h3>
            {expandedDimensionId && (
              <button onClick={() => setExpandedDimensionId(null)} className="text-xs font-bold text-os-muted hover:text-os-ink">
                Recolher todas as dimensões
              </button>
            )}
          </div>

          {dimensions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center text-sm text-os-muted">
              Esta análise ainda não tem dimensões. Adicione a primeira abaixo.
            </div>
          ) : (
            <div className="space-y-2">
              {dimensions.map((dimension, index) => {
                const dragProps = {
                  draggable: true,
                  onDragStart: () => setDraggingId(dimension.id),
                  onDragEnter: () => draggingId && draggingId !== dimension.id && setDragOverId(dimension.id),
                  onDragOver: (e: React.DragEvent) => e.preventDefault(),
                  onDragEnd: () => {
                    setDraggingId(null);
                    setDragOverId(null);
                  },
                  onDrop: () => handleDrop(dimension.id),
                };
                return (
                  <DimensionCard
                    key={dimension.id}
                    dimension={dimension}
                    index={index}
                    expanded={dimension.id === expandedDimensionId}
                    isDropTarget={dragOverId === dimension.id}
                    onExpand={() => setExpandedDimensionId(dimension.id)}
                    onCollapse={() => setExpandedDimensionId(null)}
                    expandedCriterionId={expandedCriterionId}
                    setExpandedCriterionId={setExpandedCriterionId}
                    onUpdate={(patch) => onUpdateDimension(dimension.id, patch)}
                    onDuplicate={() => onDuplicateDimension(dimension)}
                    onRequestDelete={() => requestDelete(dimension)}
                    dragProps={dragProps}
                    {...criteriaHandlers}
                  />
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={dimensionDraft}
              onChange={(e) => setDimensionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dimensionDraft.trim()) {
                  e.preventDefault();
                  onCreateDimension(dimensionDraft.trim());
                  setDimensionDraft("");
                }
              }}
              placeholder="Nome da nova dimensão"
              className={inputClass}
            />
            <button
              onClick={() => {
                if (!dimensionDraft.trim()) return;
                onCreateDimension(dimensionDraft.trim());
                setDimensionDraft("");
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
            >
              <Plus className="h-3.5 w-3.5" /> Nova dimensão
            </button>
          </div>

          {deleteTarget && (
            <ConfirmDialog
              title={`Excluir "${deleteTarget.name}"?`}
              description={`${deleteTarget.criteria.length} ${deleteTarget.criteria.length === 1 ? "critério" : "critérios"} desta dimensão também ${deleteTarget.criteria.length === 1 ? "será excluído" : "serão excluídos"}. A operação afeta somente o rascunho.`}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={async () => {
                onDeleteDimension(deleteTarget.id);
                setDeleteTarget(null);
              }}
            />
          )}
        </div>
      )}

      {tab === "criteria" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-os-ink">Todos os critérios, por dimensão</h3>
          {dimensions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center text-sm text-os-muted">
              Crie uma dimensão na aba &quot;Dimensões&quot; para começar a adicionar critérios.
            </p>
          ) : (
            dimensions.map((dimension) => (
              <div key={dimension.id} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-os-muted">{dimension.name || "Dimensão sem nome"}</p>
                <CriteriaList
                  dimension={dimension}
                  expandedCriterionId={expandedCriterionId}
                  setExpandedCriterionId={setExpandedCriterionId}
                  {...criteriaHandlers}
                />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "sources" && (
        <SourcesTab block={block} siblingBlocks={siblingBlocks} resourceOptions={resourceOptions} onUpdateMetadata={onUpdateMetadata} />
      )}

      {tab === "conclusions" && <ConclusionsTab block={block} onUpdateMetadata={onUpdateMetadata} />}
    </div>
  );
}

const SOURCE_ICONS: Record<string, typeof ClipboardList> = {
  meeting: Users,
  checklist: CheckSquare,
  form_briefing: FileText,
  document: Upload,
  internal_task: ClipboardList,
  client_request: Send,
  resource: BookOpen,
  personalizada: Link2,
};

function SourcesTab({
  block,
  siblingBlocks,
  resourceOptions,
  onUpdateMetadata,
}: {
  block: PlaybookBlockRow;
  siblingBlocks: PlaybookBlockRow[];
  resourceOptions: PlaybookResourceOption[];
  onUpdateMetadata: (patch: Record<string, unknown>) => void;
}) {
  const meta = (block.metadata ?? {}) as AnalysisBlockMetadata;
  const sources = meta.sources ?? [];
  const [type, setType] = useState<string>(ANALYSIS_SOURCE_TYPES[0].id);
  const [refId, setRefId] = useState("");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(true);
  const [purpose, setPurpose] = useState("");

  const blockSourceCandidates = siblingBlocks.filter((b) => b.type === type && b.id !== block.id);
  const isBlockRef = ["meeting", "checklist", "form_briefing", "document", "internal_task", "client_request"].includes(type);
  const isResourceRef = type === "resource";

  function addSource() {
    const effectiveLabel =
      label.trim() ||
      (isBlockRef ? blockSourceCandidates.find((b) => b.id === refId)?.title : isResourceRef ? resourceOptions.find((r) => r.id === refId)?.title : "") ||
      "";
    if (!effectiveLabel.trim()) return;
    const next: AnalysisSourceLink = {
      type: type as AnalysisSourceLink["type"],
      sourceBlockId: isBlockRef ? refId || null : null,
      resourceId: isResourceRef ? refId || null : null,
      label: effectiveLabel.trim(),
      required,
      purpose: purpose.trim() || undefined,
    };
    onUpdateMetadata({ sources: [...sources, next] });
    setRefId("");
    setLabel("");
    setPurpose("");
  }

  function removeSource(index: number) {
    onUpdateMetadata({ sources: sources.filter((_, i) => i !== index) });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sources.length) return;
    const next = [...sources];
    [next[index], next[target]] = [next[target], next[index]];
    onUpdateMetadata({ sources: next });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-os-ink">Fontes de informação</h3>
      <p className="text-xs text-os-muted">
        Vincule blocos, recursos ou fontes personalizadas de onde esta análise deve extrair informação. Sem consumo de respostas reais nesta fase.
      </p>

      {sources.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-6 text-center text-sm text-os-muted">
          Nenhuma fonte vinculada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {sources.map((source, index) => {
            const SourceIcon = SOURCE_ICONS[source.type] ?? Link2;
            return (
            <li key={index} className="rounded-xl border border-os-border bg-os-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <SourceIcon className="mt-0.5 h-4 w-4 shrink-0 text-os-muted" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-os-ink">{source.label}</p>
                    <p className="text-[11px] text-os-muted">
                      {analysisSourceTypeLabel(source.type)} · {source.required ? "Obrigatória" : "Opcional"}
                    </p>
                    {source.purpose && <p className="mt-1 text-xs text-os-muted">Finalidade: {source.purpose}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => move(index, -1)} disabled={index === 0} className="text-os-muted hover:text-os-ink disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === sources.length - 1}
                    className="text-os-muted hover:text-os-ink disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeSource(index)} className="text-os-muted hover:text-red-600" aria-label="Remover vínculo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 rounded-xl border border-dashed border-os-border p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-os-muted">Adicionar fonte</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setRefId("");
            }}
            className={inputClass}
          >
            {ANALYSIS_SOURCE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {isBlockRef ? (
            <select value={refId} onChange={(e) => setRefId(e.target.value)} className={inputClass}>
              <option value="">Selecionar bloco</option>
              {blockSourceCandidates.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          ) : isResourceRef ? (
            <select value={refId} onChange={(e) => setRefId(e.target.value)} className={inputClass}>
              <option value="">Selecionar recurso</option>
              {resourceOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          ) : (
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome da fonte" className={inputClass} />
          )}
        </div>
        {(isBlockRef || isResourceRef) && (
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome de exibição (opcional — usa o título do vínculo)" className={inputClass} />
        )}
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Finalidade (opcional)"
          rows={2}
          className={`${inputClass} resize-none`}
        />
        <div className="flex items-center justify-between">
          <Switch checked={required} onChange={setRequired} label="Obrigatória" />
          <button
            onClick={addSource}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar fonte
          </button>
        </div>
      </div>
    </div>
  );
}

function ConclusionsTab({ block, onUpdateMetadata }: { block: PlaybookBlockRow; onUpdateMetadata: (patch: Record<string, unknown>) => void }) {
  const meta = (block.metadata ?? {}) as AnalysisBlockMetadata;
  const [finalNotes, setFinalNotes] = useState(meta.finalNotes ?? "");

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-os-ink">Conclusões e recomendações</h3>
      <p className="text-xs text-os-muted">
        Define o que a análise deve produzir quando for realizada de verdade (Fase 2.2B seguinte) — nenhum resultado real é preenchido aqui.
      </p>

      <div className="flex flex-wrap gap-4">
        <Switch checked={Boolean(meta.synthesisRequired)} onChange={(v) => onUpdateMetadata({ synthesisRequired: v })} label="Síntese executiva obrigatória" />
        <Switch checked={Boolean(meta.recommendationsRequired)} onChange={(v) => onUpdateMetadata({ recommendationsRequired: v })} label="Recomendações obrigatórias" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Principais problemas (molde)</label>
          <ListFieldEditor values={meta.mainProblems ?? []} onChange={(v) => onUpdateMetadata({ mainProblems: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Pontos fortes (molde)</label>
          <ListFieldEditor values={meta.strengths ?? []} onChange={(v) => onUpdateMetadata({ strengths: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Riscos (molde)</label>
          <ListFieldEditor values={meta.risks ?? []} onChange={(v) => onUpdateMetadata({ risks: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Oportunidades (molde)</label>
          <ListFieldEditor values={meta.opportunities ?? []} onChange={(v) => onUpdateMetadata({ opportunities: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Recomendações (molde)</label>
          <ListFieldEditor values={meta.recommendations ?? []} onChange={(v) => onUpdateMetadata({ recommendations: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Prioridades (molde)</label>
          <ListFieldEditor values={meta.priorities ?? []} onChange={(v) => onUpdateMetadata({ priorities: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Evidências anexas (molde)</label>
          <ListFieldEditor values={meta.attachedEvidence ?? []} onChange={(v) => onUpdateMetadata({ attachedEvidence: v })} placeholder="Adicionar item" />
        </div>
        <div>
          <label className={labelClass}>Entregável relacionado</label>
          <input value="" disabled placeholder="Disponível após a implementação do bloco Entregável." className={`${inputClass} cursor-not-allowed opacity-60`} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Observações finais</label>
        <textarea
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          onBlur={() => finalNotes !== (meta.finalNotes ?? "") && onUpdateMetadata({ finalNotes: finalNotes.trim() || null })}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      <p className="rounded-lg border border-dashed border-os-border bg-os-bg/30 px-3 py-2 text-[11px] italic text-os-muted">
        Análise ainda não realizada.
      </p>
    </div>
  );
}
