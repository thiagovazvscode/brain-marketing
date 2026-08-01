"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TagListInput } from "@/components/admin/TagListInput";
import { PLAYBOOK_TYPES } from "@/lib/methods";
import type { SimpleOption } from "@/types/methods";

const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted";
const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const sectionClass = "rounded-2xl border border-os-border bg-os-card p-5";
const sectionTitleClass = "mb-4 font-display text-sm font-bold uppercase tracking-wide text-os-ink";

export interface PlaybookFormValues {
  name: string;
  description: string;
  objective: string;
  methodId: string;
  productId: string;
  type: string;
  defaultDurationDays: string;
  prerequisites: string[];
  expectedResult: string;
  defaultResponsibles: string[];
  requiredDocuments: string[];
  deliverables: string[];
  successCriteria: string[];
  authorId: string;
}

const EMPTY_VALUES: PlaybookFormValues = {
  name: "",
  description: "",
  objective: "",
  methodId: "",
  productId: "",
  type: "implantacao",
  defaultDurationDays: "",
  prerequisites: [],
  expectedResult: "",
  defaultResponsibles: [],
  requiredDocuments: [],
  deliverables: [],
  successCriteria: [],
  authorId: "",
};

export function PlaybookForm({
  mode,
  playbookId,
  initialValues,
  methodOptions,
  productOptions,
  authorOptions,
}: {
  mode: "create" | "edit";
  playbookId?: string;
  initialValues?: Partial<PlaybookFormValues>;
  methodOptions: SimpleOption[];
  productOptions: SimpleOption[];
  authorOptions: SimpleOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<PlaybookFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof PlaybookFormValues>(key: K, value: PlaybookFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim()) return setError("Informe o nome do playbook.");
    if (!values.methodId) return setError("Selecione o método relacionado.");
    if (!values.productId) return setError("Selecione o produto relacionado.");

    setSubmitting(true);
    setError("");
    try {
      const url = mode === "create" ? "/api/admin/playbooks" : `/api/admin/playbooks/${playbookId}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          authorId: values.authorId || undefined,
          defaultDurationDays: values.defaultDurationDays ? Number(values.defaultDurationDays) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o playbook.");
        return;
      }
      router.push(`/admin/playbooks/${data.playbook.id}`);
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
            <label className={labelClass}>Nome do playbook</label>
            <input value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Método relacionado</label>
            <select value={values.methodId} onChange={(e) => set("methodId", e.target.value)} className={inputClass}>
              <option value="">Selecione...</option>
              {methodOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Produto relacionado</label>
            <select value={values.productId} onChange={(e) => set("productId", e.target.value)} className={inputClass}>
              <option value="">Selecione...</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={values.type} onChange={(e) => set("type", e.target.value)} className={inputClass}>
              {PLAYBOOK_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Duração padrão (dias)</label>
            <input
              type="number"
              min={0}
              value={values.defaultDurationDays}
              onChange={(e) => set("defaultDurationDays", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição</label>
            <textarea value={values.description} onChange={(e) => set("description", e.target.value)} className={inputClass} rows={3} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Objetivo</label>
            <textarea value={values.objective} onChange={(e) => set("objective", e.target.value)} className={inputClass} rows={2} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Execução</h2>
        <div className="grid grid-cols-1 gap-4">
          <TagListInput label="Pré-requisitos" values={values.prerequisites} onChange={(v) => set("prerequisites", v)} />
          <div>
            <label className={labelClass}>Resultado esperado</label>
            <textarea value={values.expectedResult} onChange={(e) => set("expectedResult", e.target.value)} className={inputClass} rows={2} />
          </div>
          <TagListInput
            label="Responsáveis padrão"
            values={values.defaultResponsibles}
            onChange={(v) => set("defaultResponsibles", v)}
            placeholder="Ex.: Gestor de Tráfego"
          />
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Entregáveis</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TagListInput label="Documentos necessários" values={values.requiredDocuments} onChange={(v) => set("requiredDocuments", v)} />
          <TagListInput label="Entregáveis" values={values.deliverables} onChange={(v) => set("deliverables", v)} />
          <TagListInput label="Critérios de sucesso" values={values.successCriteria} onChange={(v) => set("successCriteria", v)} />
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Responsável pelo modelo</h2>
        <div className="max-w-xs">
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
      </section>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-os-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Criar playbook" : "Salvar alterações"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm font-semibold text-os-muted hover:text-os-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
