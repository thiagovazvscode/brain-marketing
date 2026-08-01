"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";

const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted";
const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

export interface ClientFormValues {
  name: string;
  whatsapp: string;
  enteredAt: string;
  slug: string;
}

interface ClientFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<ClientFormValues>;
  onSubmit: (values: ClientFormValues) => Promise<{ error?: string } | void>;
  onCancel: () => void;
}

export function ClientForm({ mode, initialValues, onSubmit, onCancel }: ClientFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(initialValues?.whatsapp ?? "");
  const [enteredAt, setEnteredAt] = useState(initialValues?.enteredAt ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({ name: name.trim(), whatsapp: whatsapp.trim(), enteredAt, slug });
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-2xl border border-os-border bg-os-card/50 p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nome do cliente</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(00) 00000-0000"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Data de entrada</label>
          <input
            type="date"
            value={enteredAt}
            onChange={(e) => setEnteredAt(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Slug {mode === "edit" && <span className="normal-case text-os-muted/60">(travado após criação)</span>}
          </label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            disabled={mode === "edit"}
            className={`${inputClass} disabled:opacity-50`}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Criar cliente" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-os-muted hover:text-os-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
