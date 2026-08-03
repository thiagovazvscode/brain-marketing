"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import type { PlaybookFormQuestionRow } from "@/types/methods";
import { FORM_QUESTION_TYPES, FORM_QUESTION_TYPES_WITH_OPTIONS, formQuestionTypeLabel } from "@/lib/methods";
import { Switch } from "@/components/admin/Switch";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ListFieldEditor } from "@/components/admin/blocks/ListFieldEditor";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-2.5 py-1.5 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

interface Props {
  questions: PlaybookFormQuestionRow[];
  onCreate: () => void;
  onUpdate: (questionId: string, patch: Partial<PlaybookFormQuestionRow>) => void;
  onDelete: (questionId: string) => void;
  onDuplicate: (question: PlaybookFormQuestionRow) => void;
  onReorder: (orderedIds: string[]) => void;
  error?: string | null;
}

function questionSummary(question: PlaybookFormQuestionRow): string {
  const parts: string[] = [formQuestionTypeLabel(question.questionType)];
  if (question.sectionName) parts.push(question.sectionName);
  parts.push(question.isRequired ? "Obrigatória" : "Opcional");
  if (FORM_QUESTION_TYPES_WITH_OPTIONS.includes(question.questionType as never)) {
    parts.push(`${question.options.length} ${question.options.length === 1 ? "opção" : "opções"}`);
  }
  return parts.join(" · ");
}

function CollapsedRow({
  question,
  index,
  onExpand,
  onDuplicate,
  onRequestDelete,
  dragProps,
}: {
  question: PlaybookFormQuestionRow;
  index: number;
  onExpand: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div {...dragProps} className="flex items-center gap-2 rounded-xl border border-os-border bg-os-card p-3">
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
      <span className="w-5 shrink-0 text-xs font-bold text-os-muted">{index + 1}.</span>
      <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-expanded={false}>
        <p className="truncate text-sm font-semibold text-os-ink">{question.label || "Pergunta sem enunciado"}</p>
        <p className="truncate text-[11px] text-os-muted">{questionSummary(question)}</p>
      </button>
      <button onClick={onDuplicate} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Duplicar pergunta">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button onClick={onRequestDelete} className="shrink-0 text-os-muted hover:text-red-600" aria-label="Excluir pergunta">
        <Trash2 className="h-4 w-4" />
      </button>
      <button onClick={onExpand} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Expandir pergunta">
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function ExpandedRow({
  question,
  onUpdate,
  onCollapse,
  onDuplicate,
  onRequestDelete,
  dragProps,
}: {
  question: PlaybookFormQuestionRow;
  onUpdate: (patch: Partial<PlaybookFormQuestionRow>) => void;
  onCollapse: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [label, setLabel] = useState(question.label);
  const [helpText, setHelpText] = useState(question.helpText ?? "");
  const [placeholder, setPlaceholder] = useState(question.placeholder ?? "");
  const [sectionName, setSectionName] = useState(question.sectionName ?? "");

  const [pendingType, setPendingType] = useState<string | null>(null);
  const [pendingOptions, setPendingOptions] = useState<string[]>(question.options);
  const effectiveType = pendingType ?? question.questionType;
  const needsOptions = FORM_QUESTION_TYPES_WITH_OPTIONS.includes(effectiveType as never);
  const isPending = pendingType !== null && pendingType !== question.questionType;

  function handleTypeChange(newType: string) {
    const needsOpts = FORM_QUESTION_TYPES_WITH_OPTIONS.includes(newType as never);
    if (!needsOpts) {
      setPendingType(null);
      onUpdate({ questionType: newType });
      return;
    }
    setPendingType(newType);
    setPendingOptions(question.options);
  }

  function handleOptionsChange(values: string[]) {
    setPendingOptions(values);
    const cleaned = values.map((v) => v.trim()).filter(Boolean);
    if (cleaned.length < 2) return;
    if (isPending) {
      onUpdate({ questionType: pendingType!, options: values });
      setPendingType(null);
    } else {
      onUpdate({ options: values });
    }
  }

  return (
    <div {...dragProps} className="rounded-xl border border-os-accent/40 bg-os-card p-3">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label.trim() && label !== question.label && onUpdate({ label: label.trim() })}
            placeholder="Enunciado da pergunta"
            className={`${inputClass} font-semibold`}
          />
          <textarea
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            onBlur={() => helpText !== (question.helpText ?? "") && onUpdate({ helpText: helpText.trim() || null })}
            placeholder="Descrição de apoio (opcional)"
            rows={2}
            className={`${inputClass} resize-none text-xs`}
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={effectiveType} onChange={(e) => handleTypeChange(e.target.value)} className={inputClass}>
              {FORM_QUESTION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              onBlur={() => sectionName !== (question.sectionName ?? "") && onUpdate({ sectionName: sectionName.trim() || null })}
              placeholder="Seção (opcional)"
              className={inputClass}
            />
          </div>
          <input
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            onBlur={() => placeholder !== (question.placeholder ?? "") && onUpdate({ placeholder: placeholder.trim() || null })}
            placeholder="Placeholder (opcional)"
            className={`${inputClass} text-xs`}
          />
          {needsOptions && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-os-muted">Opções (mín. 2)</p>
              <ListFieldEditor values={pendingOptions} onChange={handleOptionsChange} placeholder="Adicionar opção" />
              {isPending && pendingOptions.map((v) => v.trim()).filter(Boolean).length < 2 && (
                <p className="mt-1 text-[11px] text-os-muted">Adicione ao menos duas opções para salvar este tipo de pergunta.</p>
              )}
            </div>
          )}
          <Switch checked={question.isRequired} onChange={(v) => onUpdate({ isRequired: v })} label="Obrigatória" />
          <div className="flex items-center justify-between border-t border-os-border pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onDuplicate} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </button>
              <button onClick={onRequestDelete} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
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

export function FormBuilder({ questions, onCreate, onUpdate, onDelete, onDuplicate, onReorder, error }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookFormQuestionRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorder(ids);
  }

  function requestDelete(question: PlaybookFormQuestionRow) {
    if (question.helpText || question.options.length > 0 || question.sectionName) {
      setDeleteTarget(question);
    } else {
      onDelete(question.id);
    }
  }

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-os-ink">Perguntas do Formulário</h3>
        <div className="flex items-center gap-2">
          {expandedId && (
            <button onClick={() => setExpandedId(null)} className="text-xs font-bold text-os-muted hover:text-os-ink">
              Recolher todas as perguntas
            </button>
          )}
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar pergunta
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center text-sm text-os-muted">
          Este formulário ainda não tem perguntas. Adicione a primeira acima.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, index) => {
            const dragProps = {
              draggable: true,
              onDragStart: () => setDraggingId(q.id),
              onDragOver: (e: React.DragEvent) => e.preventDefault(),
              onDrop: () => handleDrop(q.id),
            };
            return q.id === expandedId ? (
              <ExpandedRow
                key={q.id}
                question={q}
                onUpdate={(patch) => onUpdate(q.id, patch)}
                onCollapse={() => setExpandedId(null)}
                onDuplicate={() => onDuplicate(q)}
                onRequestDelete={() => requestDelete(q)}
                dragProps={dragProps}
              />
            ) : (
              <CollapsedRow
                key={q.id}
                question={q}
                index={index}
                onExpand={() => setExpandedId(q.id)}
                onDuplicate={() => onDuplicate(q)}
                onRequestDelete={() => requestDelete(q)}
                dragProps={dragProps}
              />
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-os-muted">0 de {questions.length} respostas — representação de como aparecerá na execução futura.</p>

      {deleteTarget && (
        <ConfirmDialog
          title={`Excluir "${deleteTarget.label}"?`}
          description="Esta pergunta já tem configuração preenchida. A operação afeta somente o rascunho."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
