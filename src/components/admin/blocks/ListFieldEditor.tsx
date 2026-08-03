"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

/**
 * Lista simples de textos (pré-requisitos, documentos necessários, materiais
 * a enviar, participantes por papel...) — adicionar, editar inline, excluir,
 * reordenar com setas. Sem drag-and-drop: são listas curtas, não precisa.
 */
export function ListFieldEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    onChange([...values, draft.trim()]);
    setDraft("");
  }

  function update(index: number, value: string) {
    onChange(values.map((v, i) => (i === index ? value : v)));
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-1">
          <input value={v} onChange={(e) => update(i, e.target.value)} className={inputClass} />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-os-muted hover:text-os-ink disabled:opacity-30">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === values.length - 1} className="text-os-muted hover:text-os-ink disabled:opacity-30">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => remove(i)} className="text-os-muted hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button type="button" onClick={add} className="flex shrink-0 items-center gap-1 rounded-lg border border-os-border px-2.5 text-xs font-bold text-os-ink hover:border-os-accent">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
