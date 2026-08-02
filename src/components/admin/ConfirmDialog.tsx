"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Excluir",
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-os-border bg-os-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-black text-os-ink">{title}</h3>
        <p className="mt-1 text-sm text-os-muted">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg">
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
