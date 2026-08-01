"use client";

import { useState } from "react";
import { LOSS_REASONS } from "@/lib/crm";

// Perder sem registrar o porquê joga fora a única informação que faz o funil
// melhorar — por isso o motivo é obrigatório, validado também no servidor.
export function LossReasonDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (reason: string, notes: string) => void;
}) {
  const [reason, setReason] = useState<string>(LOSS_REASONS[0].id);
  const [notes, setNotes] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-black text-os-ink">Por que essa oportunidade foi perdida?</h3>
        <p className="mt-1 text-xs text-os-muted">
          Sem o motivo, não dá para saber o que ajustar no funil depois.
        </p>

        <div className="mt-4 space-y-1.5">
          {LOSS_REASONS.map((r) => (
            <label
              key={r.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                reason === r.id
                  ? "border-os-accent bg-os-accent-soft text-os-ink"
                  : "border-os-border text-os-muted hover:bg-os-bg"
              }`}
            >
              <input
                type="radio"
                name="loss-reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="accent-os-accent"
              />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Detalhe o que aconteceu (opcional)"
          className="mt-3 w-full rounded-lg border border-os-border bg-os-card px-3 py-2 text-sm text-os-ink placeholder:text-os-muted focus:border-os-accent focus:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted transition hover:bg-os-bg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason, notes)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Marcar como perdida
          </button>
        </div>
      </div>
    </div>
  );
}
