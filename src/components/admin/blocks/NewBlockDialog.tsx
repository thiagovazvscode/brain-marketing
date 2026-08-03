"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  DOCUMENT_KINDS,
  DOCUMENT_ORIGINS,
  FORM_QUESTION_TYPES,
  MEETING_DURATION_UNITS,
  MEETING_FORMATS,
  MEETING_TYPES,
  formQuestionTypeLabel,
} from "@/lib/methods";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-os-muted";

// Tipos de pergunta que não exigem opções — únicos disponíveis no
// quick-add da criação (seleção única/múltipla pedem >= 2 opções, e o
// construtor completo de perguntas — com edição de opções — só existe
// depois que o bloco já foi criado).
const QUICK_ADD_QUESTION_TYPES = FORM_QUESTION_TYPES.filter((t) => t.id !== "selecao_unica" && t.id !== "multipla_selecao");

type BlockKind = "meeting" | "checklist" | "form_briefing" | "document";

interface Props {
  type: BlockKind;
  onCancel: () => void;
  onSubmit: (payload: {
    title: string;
    metadata?: Record<string, unknown>;
    checklistItems?: { title: string }[];
    questions?: { label: string; questionType: string }[];
  }) => Promise<void>;
}

const TITLES: Record<BlockKind, string> = {
  meeting: "Nova reunião",
  checklist: "Novo checklist",
  form_briefing: "Novo formulário / briefing",
  document: "Novo documento",
};

export function NewBlockDialog({ type, onCancel, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reunião
  const [meetingType, setMeetingType] = useState("imersao");
  const [objective, setObjective] = useState("");
  const [durationValue, setDurationValue] = useState("60");
  const [durationUnit, setDurationUnit] = useState("minutos");
  const [format, setFormat] = useState("online");

  // Documento
  const [documentKind, setDocumentKind] = useState("necessario");
  const [origin, setOrigin] = useState("brain");

  // Checklist
  const [itemDraft, setItemDraft] = useState("");
  const [items, setItems] = useState<string[]>([]);

  // Formulário
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionType, setQuestionType] = useState<string>(QUICK_ADD_QUESTION_TYPES[0].id);
  const [questions, setQuestions] = useState<{ label: string; questionType: string }[]>([]);

  function addItem() {
    if (!itemDraft.trim()) return;
    setItems((cur) => [...cur, itemDraft.trim()]);
    setItemDraft("");
  }

  function addQuestion() {
    if (!questionDraft.trim()) return;
    setQuestions((cur) => [...cur, { label: questionDraft.trim(), questionType }]);
    setQuestionDraft("");
  }

  async function submit() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (type === "meeting") {
        await onSubmit({
          title: title.trim(),
          metadata: {
            meetingType,
            objective: objective.trim() || undefined,
            durationValue: durationValue ? Number(durationValue) : null,
            durationUnit,
            format,
          },
        });
      } else if (type === "document") {
        await onSubmit({ title: title.trim(), metadata: { documentKind, origin } });
      } else if (type === "checklist") {
        await onSubmit({ title: title.trim(), checklistItems: items.map((i) => ({ title: i })) });
      } else {
        await onSubmit({ title: title.trim(), questions });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o bloco.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-os-border bg-os-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-os-border p-5">
          <h3 className="text-base font-black text-os-ink">{TITLES[type]}</h3>
          <p className="mt-0.5 text-xs text-os-muted">
            Preencha o essencial agora — o restante da configuração fica disponível assim que o bloco for salvo.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div>
            <label className={labelClass}>{type === "checklist" ? "Nome do checklist" : type === "form_briefing" ? "Nome do formulário" : "Título"} *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className={inputClass} />
          </div>

          {type === "meeting" && (
            <>
              <div>
                <label className={labelClass}>Tipo de reunião</label>
                <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className={inputClass}>
                  {MEETING_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Objetivo</label>
                <input value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Duração estimada</label>
                  <input type="number" min={0} value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unidade</label>
                  <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className={inputClass}>
                    {MEETING_DURATION_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Formato</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className={inputClass}>
                  {MEETING_FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === "document" && (
            <>
              <div>
                <label className={labelClass}>Tipo de documento</label>
                <select value={documentKind} onChange={(e) => setDocumentKind(e.target.value)} className={inputClass}>
                  {DOCUMENT_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Origem</label>
                <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass}>
                  {DOCUMENT_ORIGINS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === "checklist" && (
            <div>
              <label className={labelClass}>Itens do checklist (opcional agora)</label>
              <div className="flex gap-2">
                <input
                  value={itemDraft}
                  onChange={(e) => setItemDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="Ex: Contrato revisado"
                  className={inputClass}
                />
                <button onClick={addItem} className="flex shrink-0 items-center gap-1 rounded-lg border border-os-border px-3 text-xs font-bold text-os-ink hover:border-os-accent">
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              {items.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-os-border bg-os-bg/40 px-3 py-1.5 text-xs text-os-ink">
                      {it}
                      <button onClick={() => setItems((cur) => cur.filter((_, idx) => idx !== i))} className="text-os-muted hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {type === "form_briefing" && (
            <div className="min-w-0">
              <label className={labelClass}>Perguntas do formulário (opcional agora)</label>
              <div className="flex min-w-0 flex-col gap-2">
                <input
                  value={questionDraft}
                  onChange={(e) => setQuestionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addQuestion();
                    }
                  }}
                  placeholder="Ex: Quantos leads entram mensalmente?"
                  className={`${inputClass} min-w-0`}
                />
                <div className="flex min-w-0 gap-2">
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className={`${inputClass} min-w-0 flex-1`}
                  >
                    {QUICK_ADD_QUESTION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addQuestion}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-os-border px-3 text-xs font-bold text-os-ink hover:border-os-accent"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-os-muted">Perguntas de seleção única/múltipla podem ser adicionadas depois que o bloco for salvo.</p>
              {questions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {questions.map((q, i) => (
                    <li
                      key={i}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-os-border bg-os-bg/40 px-3 py-1.5 text-xs text-os-ink"
                    >
                      <span className="min-w-0 flex-1 break-words">
                        {q.label} <span className="text-os-muted">· {formQuestionTypeLabel(q.questionType)}</span>
                      </span>
                      <button
                        onClick={() => setQuestions((cur) => cur.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-os-muted hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-os-border p-4">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar bloco
          </button>
        </div>
      </div>
    </div>
  );
}
