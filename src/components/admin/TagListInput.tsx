"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

// Input de lista simples (princípios, premissas, indicadores, riscos, etc.) —
// reutilizado nos formulários de método e playbook para não repetir o mesmo
// padrão "texto + botão adicionar + chips removíveis" em cada campo jsonb.
export function TagListInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...values, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="flex shrink-0 items-center justify-center rounded-lg border border-os-border px-3 text-os-muted hover:border-os-accent hover:text-os-accent"
          aria-label={`Adicionar ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-os-bg px-3 py-1.5 text-xs text-os-ink"
            >
              <span className="min-w-0 flex-1">{value}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="shrink-0 text-os-muted hover:text-red-500"
                aria-label={`Remover ${value}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
