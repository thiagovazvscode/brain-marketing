"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { DURATION_UNITS, PLAYBOOK_BLOCK_PRIORITIES } from "@/lib/methods";
import { Switch } from "@/components/admin/Switch";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-os-muted";

export interface StageDraft {
  name: string;
  objective: string;
  description: string;
  internalInstructions: string;
  durationValue: string;
  durationUnit: string;
  defaultAssigneeRole: string;
  isRequired: boolean;
  blocksNextStage: boolean;
  completionCriteria: string;
  expectedDeliverable: string;
  priority: string;
  tags: string;
}

export const EMPTY_STAGE_DRAFT: StageDraft = {
  name: "",
  objective: "",
  description: "",
  internalInstructions: "",
  durationValue: "",
  durationUnit: "dias_uteis",
  defaultAssigneeRole: "",
  isRequired: true,
  blocksNextStage: false,
  completionCriteria: "",
  expectedDeliverable: "",
  priority: "media",
  tags: "",
};

// Modal "Nova etapa" — só cria. Editar uma etapa existente acontece inline
// na coluna direita (Configuração da Etapa, com autosave), pra não manter
// dois caminhos de persistência diferentes pros mesmos campos.
export function StageFormPanel({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (draft: StageDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<StageDraft>(EMPTY_STAGE_DRAFT);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof StageDraft>(key: K, value: StageDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    if (!draft.name.trim() || !draft.objective.trim()) return;
    setBusy(true);
    try {
      await onSubmit(draft);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-black text-os-ink">Nova etapa</h3>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nome da etapa *</label>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Imersão com o cliente"
              className={inputClass}
              autoFocus
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Objetivo *</label>
            <input
              value={draft.objective}
              onChange={(e) => set("objective", e.target.value)}
              placeholder="Descreva o objetivo principal desta etapa"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição / Instruções internas</label>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Instruções detalhadas para a equipe executar esta etapa..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Duração estimada</label>
            <input
              type="number"
              min={0}
              value={draft.durationValue}
              onChange={(e) => set("durationValue", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Unidade</label>
            <select value={draft.durationUnit} onChange={(e) => set("durationUnit", e.target.value)} className={inputClass}>
              {DURATION_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Responsável padrão</label>
            <input
              value={draft.defaultAssigneeRole}
              onChange={(e) => set("defaultAssigneeRole", e.target.value)}
              placeholder="Ex: Consultor"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prioridade</label>
            <select value={draft.priority} onChange={(e) => set("priority", e.target.value)} className={inputClass}>
              {PLAYBOOK_BLOCK_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Entregável esperado</label>
            <input
              value={draft.expectedDeliverable}
              onChange={(e) => set("expectedDeliverable", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Critério de conclusão</label>
            <input
              value={draft.completionCriteria}
              onChange={(e) => set("completionCriteria", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Tags (separadas por vírgula)</label>
            <input value={draft.tags} onChange={(e) => set("tags", e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <Switch checked={draft.isRequired} onChange={(v) => set("isRequired", v)} label="Etapa obrigatória" />
          </div>
          <div className="sm:col-span-2">
            <Switch checked={draft.blocksNextStage} onChange={(v) => set("blocksNextStage", v)} label="Bloqueia próxima etapa" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !draft.name.trim() || !draft.objective.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar etapa
          </button>
        </div>
      </div>
    </div>
  );
}
