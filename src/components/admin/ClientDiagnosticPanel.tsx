"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm text-ink focus:border-brand-primary focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted";

export interface DiagnosticRow {
  id: string;
  scores: { aquisicao: number; posicionamento: number; processoComercial: number; tecnologia: number } | null;
  bottleneck: string | null;
  recommendations: { productSlug: string; reason: string }[] | null;
  createdAt: string | Date;
}

const PILLAR_LABEL: Record<string, string> = {
  aquisicao: "Aquisição",
  posicionamento: "Posicionamento",
  processoComercial: "Processo comercial",
  tecnologia: "Tecnologia",
};

export function ClientDiagnosticPanel({ clientSlug, diagnostics }: { clientSlug: string; diagnostics: DiagnosticRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(diagnostics.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState({ aquisicao: 5, posicionamento: 5, processoComercial: 5, tecnologia: 5 });

  const latest = diagnostics[0];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientSlug}/diagnostics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });
      if (response.ok) {
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {latest && (
        <div className="rounded-xl border border-line bg-elevated/40 p-4">
          <p className="text-xs text-muted">
            Último diagnóstico em {new Date(latest.createdAt).toLocaleDateString("pt-BR")} — gargalo: {" "}
            <span className="font-semibold text-ink">{PILLAR_LABEL[latest.bottleneck ?? ""] ?? latest.bottleneck}</span>
          </p>
          {latest.scores && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(latest.scores).map(([pillar, value]) => (
                <div key={pillar}>
                  <p className="text-[11px] uppercase tracking-wide text-muted">{PILLAR_LABEL[pillar]}</p>
                  <p className="text-lg font-bold text-ink">{value}/10</p>
                </div>
              ))}
            </div>
          )}
          {latest.recommendations && latest.recommendations.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-line pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-magenta">Recomendação de upsell</p>
              {latest.recommendations.map((r) => (
                <p key={r.productSlug} className="text-xs text-ink/80">
                  <span className="font-semibold text-ink">{r.productSlug}</span> — {r.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="text-xs font-semibold text-brand-primary hover:underline">
          Novo diagnóstico
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-elevated/40 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(scores) as (keyof typeof scores)[]).map((pillar) => (
              <div key={pillar}>
                <label className={labelClass}>{PILLAR_LABEL[pillar]}</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={scores[pillar]}
                  onChange={(e) => setScores((prev) => ({ ...prev, [pillar]: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Calcular diagnóstico
            </button>
            {diagnostics.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)} className="text-xs font-semibold text-muted hover:text-ink">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
