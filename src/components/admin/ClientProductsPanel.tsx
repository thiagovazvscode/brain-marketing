"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { METHOD_STAGES } from "@/lib/method-stages";

const selectClass =
  "rounded-lg border border-line bg-bg/60 px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-brand-primary focus:outline-none";

export interface EngagementRow {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  status: "ativo" | "pausado" | "encerrado";
  currentStage: string;
  startedAt: string;
  endedAt: string | null;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
}

const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", pausado: "Pausado", encerrado: "Encerrado" };
const STATUS_DOT: Record<string, string> = { ativo: "bg-emerald-400", pausado: "bg-amber-400", encerrado: "bg-slate-500" };

export function ClientProductsPanel({
  clientSlug,
  engagements,
  upsellCandidates,
}: {
  clientSlug: string;
  engagements: EngagementRow[];
  upsellCandidates: ProductRow[];
}) {
  const router = useRouter();
  const [addingProductId, setAddingProductId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!addingProductId) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientSlug}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: addingProductId }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Não foi possível associar o produto.");
        return;
      }
      setAddingProductId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateEngagement(id: string, patch: Record<string, string>) {
    setUpdatingId(id);
    try {
      await fetch(`/api/admin/clients/${clientSlug}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Contratados</h3>
        {engagements.length === 0 ? (
          <p className="text-sm text-muted">Nenhum produto contratado ainda.</p>
        ) : (
          <div className="space-y-2">
            {engagements.map((eng) => (
              <div key={eng.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[eng.status]}`} />
                    {eng.productName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {STATUS_LABEL[eng.status]} · desde {new Date(eng.startedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={eng.currentStage}
                    disabled={updatingId === eng.id}
                    onChange={(e) => updateEngagement(eng.id, { currentStage: e.target.value })}
                    className={selectClass}
                  >
                    {METHOD_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={eng.status}
                    disabled={updatingId === eng.id}
                    onChange={(e) => updateEngagement(eng.id, { status: e.target.value })}
                    className={selectClass}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-magenta">Oportunidades de upsell</h3>
        {upsellCandidates.length === 0 ? (
          <p className="text-sm text-muted">Cliente já tem todo o catálogo ativo.</p>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
            <select
              value={addingProductId}
              onChange={(e) => setAddingProductId(e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione um produto...</option>
              {upsellCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!addingProductId || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Associar
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
