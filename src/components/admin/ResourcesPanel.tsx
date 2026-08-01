"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link as LinkIcon, Loader2, Plus } from "lucide-react";
import { RESOURCE_TYPES, isValidResourceUrl, resourceTypeLabel } from "@/lib/methods";
import type { ResourceRow } from "@/types/methods";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

// Estrutura inicial da biblioteca de recursos (item 3/4 do pedido) — lista +
// cadastro simples quando associado a um método/playbook específico. Sem CRUD
// completo (edição/remoção) nesta etapa.
export function ResourcesPanel({
  resources,
  methodId,
  playbookId,
}: {
  resources: ResourceRow[];
  methodId?: string;
  playbookId?: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("outro");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canCreate = Boolean(methodId || playbookId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Informe o título do recurso.");
      return;
    }
    if (!isValidResourceUrl(url)) {
      setError("Link inválido — use apenas endereços http:// ou https://.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, url, methodId, playbookId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível criar o recurso.");
        return;
      }
      setTitle("");
      setUrl("");
      setType("outro");
      setCreating(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {canCreate &&
        (creating ? (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-os-accent/40 bg-os-card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do recurso" className={inputClass} autoFocus />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="sm:col-span-3">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (opcional)" className={inputClass} />
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-3 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Adicionar
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-xs font-semibold text-os-muted hover:text-os-ink">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-3.5 py-2 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
          >
            <Plus className="h-4 w-4" />
            Novo recurso
          </button>
        ))}

      {resources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
          Nenhum recurso cadastrado ainda. A biblioteca completa de recursos entra numa próxima etapa.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {resources.map((r) => (
            <div key={r.id} className="rounded-xl border border-os-border bg-os-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-os-ink">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-os-muted" />
                  <span className="truncate">{r.title}</span>
                </p>
                <span className="shrink-0 rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-bold text-os-muted">
                  {resourceTypeLabel(r.type)}
                </span>
              </div>
              {r.url && isValidResourceUrl(r.url) && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-xs text-os-accent hover:underline"
                >
                  <LinkIcon className="h-3 w-3" /> Abrir link
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
