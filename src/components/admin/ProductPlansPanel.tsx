"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const inputClass =
  "rounded-lg border border-os-border bg-os-bg/60 px-2.5 py-1.5 text-xs font-semibold text-os-ink focus:border-os-accent focus:outline-none";

const BILLING_TYPES = [
  { id: "recorrente", label: "Recorrente" },
  { id: "pontual", label: "Pontual" },
] as const;

const BILLING_CYCLES = [
  { id: "mensal", label: "Mensal" },
  { id: "trimestral", label: "Trimestral" },
  { id: "semestral", label: "Semestral" },
  { id: "anual", label: "Anual" },
  { id: "unico", label: "Único" },
] as const;

export interface PlanRow {
  id: string;
  name: string;
  billingType: "recorrente" | "pontual";
  billingCycle: "mensal" | "trimestral" | "semestral" | "anual" | "unico";
  basePrice: string;
  isDefault: boolean;
  isActive: boolean;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductPlansPanel({ productSlug, plans }: { productSlug: string; plans: PlanRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [billingType, setBillingType] = useState<(typeof BILLING_TYPES)[number]["id"]>("recorrente");
  const [billingCycle, setBillingCycle] = useState<(typeof BILLING_CYCLES)[number]["id"]>("mensal");
  const [basePrice, setBasePrice] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do plano.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productSlug}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), billingType, billingCycle, basePrice }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Não foi possível criar o plano.");
        return;
      }
      setName("");
      setBasePrice("0");
      setCreating(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePlanActive(plan: PlanRow) {
    setUpdatingId(plan.id);
    try {
      await fetch(`/api/admin/products/${productSlug}/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <p className="text-sm text-os-muted">Nenhum plano cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-os-border bg-os-bg/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-os-ink">
                  {plan.name}
                  {plan.isDefault && <span className="ml-2 text-[10px] font-bold uppercase text-os-accent">Padrão</span>}
                </p>
                <p className="mt-0.5 text-xs text-os-muted">
                  {BILLING_TYPES.find((t) => t.id === plan.billingType)?.label} ·{" "}
                  {BILLING_CYCLES.find((c) => c.id === plan.billingCycle)?.label} · {formatCurrency(plan.basePrice)}
                </p>
              </div>
              <button
                onClick={() => togglePlanActive(plan)}
                disabled={updatingId === plan.id}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  plan.isActive ? "bg-os-accent-soft text-os-accent" : "bg-os-border text-os-muted"
                }`}
              >
                {plan.isActive ? "Ativo" : "Inativo"}
              </button>
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 rounded-xl border border-os-border bg-os-bg/40 p-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-os-muted">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-os-muted">Cobrança</label>
            <select value={billingType} onChange={(e) => setBillingType(e.target.value as typeof billingType)} className={inputClass}>
              {BILLING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-os-muted">Ciclo</label>
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as typeof billingCycle)} className={inputClass}>
              {BILLING_CYCLES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-os-muted">Preço-base (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className={`${inputClass} w-28`}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar plano
          </button>
          <button type="button" onClick={() => setCreating(false)} className="text-xs font-semibold text-os-muted hover:text-os-ink">
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg border border-os-border px-3 py-1.5 text-xs font-bold text-os-ink hover:bg-os-bg"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo plano
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
