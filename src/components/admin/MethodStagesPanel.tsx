"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { MethodStageRow } from "@/types/methods";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-os-muted";

interface StageDraft {
  name: string;
  objective: string;
  description: string;
  expectedResult: string;
  successCriteria: string;
}

const EMPTY_DRAFT: StageDraft = { name: "", objective: "", description: "", expectedResult: "", successCriteria: "" };

// Fora do componente de propósito: declarar componentes dentro do render
// reseta o estado do formulário a cada re-render (regra react-hooks/static-components).
function DraftFields({ draft, onChange }: { draft: StageDraft; onChange: (next: StageDraft) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass}>Nome da macroetapa</label>
        <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className={inputClass} autoFocus />
      </div>
      <div>
        <label className={labelClass}>Objetivo</label>
        <input value={draft.objective} onChange={(e) => onChange({ ...draft, objective: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Resultado esperado</label>
        <input value={draft.expectedResult} onChange={(e) => onChange({ ...draft, expectedResult: e.target.value })} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Descrição</label>
        <textarea value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} className={inputClass} rows={2} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Critério de sucesso</label>
        <input value={draft.successCriteria} onChange={(e) => onChange({ ...draft, successCriteria: e.target.value })} className={inputClass} />
      </div>
    </div>
  );
}

export function MethodStagesPanel({ methodId, stages }: { methodId: string; stages: MethodStageRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StageDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  function startEdit(stage: MethodStageRow) {
    setEditingId(stage.id);
    setCreating(false);
    setDraft({
      name: stage.name,
      objective: stage.objective ?? "",
      description: stage.description ?? "",
      expectedResult: stage.expectedResult ?? "",
      successCriteria: stage.successCriteria ?? "",
    });
  }

  async function submitCreate() {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/methods/${methodId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setCreating(false);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(stageId: string) {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/methods/${methodId}/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(stageId: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/methods/${methodId}/stages/${stageId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stages.length) return;
    const orderedIds = stages.map((s) => s.id);
    [orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]];
    setBusy(true);
    try {
      await fetch(`/api/admin/methods/${methodId}/stages/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {stages.length === 0 && !creating && (
        <p className="rounded-xl border border-dashed border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
          Nenhuma macroetapa cadastrada ainda.
        </p>
      )}

      {stages.map((stage, index) =>
        editingId === stage.id ? (
          <div key={stage.id} className="rounded-2xl border border-os-accent/40 bg-os-card p-4">
            <DraftFields draft={draft} onChange={setDraft} />
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => submitEdit(stage.id)}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
              </button>
              <button onClick={() => setEditingId(null)} className="text-xs font-semibold text-os-muted hover:text-os-ink">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div key={stage.id} className="flex items-start gap-3 rounded-2xl border border-os-border bg-os-card p-4">
            <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-os-accent/15 text-xs font-bold text-os-accent">
                {index + 1}
              </span>
              <button onClick={() => move(index, -1)} disabled={busy || index === 0} className="text-os-muted hover:text-os-ink disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={busy || index === stages.length - 1}
                className="text-os-muted hover:text-os-ink disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-os-ink">{stage.name}</p>
              {stage.objective && <p className="mt-0.5 text-xs text-os-muted">{stage.objective}</p>}
              {stage.description && <p className="mt-1 text-xs text-os-muted">{stage.description}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-os-muted">
                {stage.expectedResult && <span>Resultado: {stage.expectedResult}</span>}
                {stage.successCriteria && <span>Critério: {stage.successCriteria}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => startEdit(stage)} className="text-os-muted hover:text-os-ink" aria-label="Editar macroetapa">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(stage.id)} className="text-os-muted hover:text-red-500" aria-label="Remover macroetapa">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      )}

      {creating ? (
        <div className="rounded-2xl border border-os-accent/40 bg-os-card p-4">
          <DraftFields draft={draft} onChange={setDraft} />
          <div className="mt-3 flex gap-3">
            <button
              onClick={submitCreate}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Adicionar
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setDraft(EMPTY_DRAFT);
              }}
              className="text-xs font-semibold text-os-muted hover:text-os-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
            setDraft(EMPTY_DRAFT);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-3.5 py-2 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
        >
          <Plus className="h-4 w-4" />
          Nova macroetapa
        </button>
      )}
    </div>
  );
}
