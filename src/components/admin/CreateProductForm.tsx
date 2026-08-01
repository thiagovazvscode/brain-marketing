"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted";
const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

export function CreateProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category: category.trim(), shortDescription: shortDescription.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Não foi possível criar o produto.");
        return;
      }
      setName("");
      setCategory("");
      setShortDescription("");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110"
      >
        <Plus className="h-4 w-4" />
        Novo produto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-os-border bg-os-card p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
        </div>
        <div>
          <label className={labelClass}>Categoria</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="Ex.: Aquisição" />
        </div>
        <div>
          <label className={labelClass}>Descrição curta</label>
          <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar produto
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-os-muted hover:text-os-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
