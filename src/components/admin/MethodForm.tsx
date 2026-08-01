"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TagListInput } from "@/components/admin/TagListInput";
import type { SimpleOption } from "@/types/methods";

const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted";
const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const sectionClass = "rounded-2xl border border-os-border bg-os-card p-5";
const sectionTitleClass = "mb-4 font-display text-sm font-bold uppercase tracking-wide text-os-ink";

export interface MethodFormValues {
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  problemSolved: string;
  idealClientProfile: string;
  expectedResult: string;
  principles: string[];
  premises: string[];
  successIndicators: string[];
  risks: string[];
  authorId: string;
  productIds: string[];
}

const EMPTY_VALUES: MethodFormValues = {
  name: "",
  shortDescription: "",
  fullDescription: "",
  category: "",
  problemSolved: "",
  idealClientProfile: "",
  expectedResult: "",
  principles: [],
  premises: [],
  successIndicators: [],
  risks: [],
  authorId: "",
  productIds: [],
};

export function MethodForm({
  mode,
  methodId,
  initialValues,
  productOptions,
  authorOptions,
}: {
  mode: "create" | "edit";
  methodId?: string;
  initialValues?: Partial<MethodFormValues>;
  productOptions: SimpleOption[];
  authorOptions: SimpleOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<MethodFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof MethodFormValues>(key: K, value: MethodFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleProduct(id: string) {
    set("productIds", values.productIds.includes(id) ? values.productIds.filter((p) => p !== id) : [...values.productIds, id]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError("Informe o nome do método.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const url = mode === "create" ? "/api/admin/methods" : `/api/admin/methods/${methodId}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, authorId: values.authorId || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o método.");
        return;
      }
      router.push(`/admin/metodos/${data.method.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Identificação</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nome do método</label>
            <input value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Categoria</label>
            <input
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputClass}
              placeholder="Ex.: Comercial, Marketing, Produto"
            />
          </div>
          <div>
            <label className={labelClass}>Descrição curta</label>
            <input value={values.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição completa</label>
            <textarea
              value={values.fullDescription}
              onChange={(e) => set("fullDescription", e.target.value)}
              className={inputClass}
              rows={4}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Diagnóstico</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Problema que resolve</label>
            <textarea value={values.problemSolved} onChange={(e) => set("problemSolved", e.target.value)} className={inputClass} rows={3} />
          </div>
          <div>
            <label className={labelClass}>Perfil de cliente ideal</label>
            <textarea
              value={values.idealClientProfile}
              onChange={(e) => set("idealClientProfile", e.target.value)}
              className={inputClass}
              rows={3}
            />
          </div>
          <div>
            <label className={labelClass}>Resultado esperado</label>
            <textarea value={values.expectedResult} onChange={(e) => set("expectedResult", e.target.value)} className={inputClass} rows={3} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Princípios &amp; Indicadores</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TagListInput label="Princípios" values={values.principles} onChange={(v) => set("principles", v)} placeholder="Ex.: Dados antes de opinião" />
          <TagListInput label="Premissas" values={values.premises} onChange={(v) => set("premises", v)} placeholder="Ex.: Cliente engajado na imersão" />
          <TagListInput
            label="Indicadores de sucesso"
            values={values.successIndicators}
            onChange={(v) => set("successIndicators", v)}
            placeholder="Ex.: +30% em leads qualificados"
          />
          <TagListInput label="Riscos" values={values.risks} onChange={(v) => set("risks", v)} placeholder="Ex.: Baixo engajamento do time" />
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Relacionamentos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Autor</label>
            <select value={values.authorId} onChange={(e) => set("authorId", e.target.value)} className={inputClass}>
              <option value="">Sem autor definido</option>
              {authorOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Produtos relacionados</label>
            {productOptions.length === 0 ? (
              <p className="text-xs text-os-muted">Nenhum produto cadastrado ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {productOptions.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      values.productIds.includes(p.id) ? "bg-os-accent text-white" : "bg-os-bg text-os-muted hover:text-os-ink"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-os-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Criar método" : "Salvar alterações"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm font-semibold text-os-muted hover:text-os-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
