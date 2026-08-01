"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { OPPORTUNITY_SOURCES, OPPORTUNITY_PRIORITIES } from "@/lib/crm";

const field =
  "w-full rounded-lg border border-os-border bg-os-card px-3 py-2 text-sm text-os-ink placeholder:text-os-muted focus:border-os-accent focus:outline-none";

export function NewOpportunityForm({
  stageId,
  onClose,
  onCreated,
}: {
  stageId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    whatsapp: "",
    email: "",
    source: "site",
    estimatedValue: "",
    priority: "media",
    nextAction: "",
    nextActionDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.companyName.trim() || form.contactName.trim();
    if (!nome) {
      setError("Informe a empresa ou o nome do contato.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stageId, title: nome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar.");
        return;
      }
      onCreated();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
      >
        <h3 className="text-base font-black text-os-ink">Nova oportunidade</h3>
        <p className="mt-1 text-xs text-os-muted">Só empresa ou contato é obrigatório — o resto dá pra completar depois.</p>

        {error && (
          <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-os-muted">
            Empresa
            <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={`mt-1 ${field}`} placeholder="Imóveis Alvorada" />
          </label>
          <label className="text-xs font-semibold text-os-muted">
            Contato
            <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={`mt-1 ${field}`} placeholder="Marcos" />
          </label>
          <label className="text-xs font-semibold text-os-muted">
            WhatsApp
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={`mt-1 ${field}`} placeholder="(91) 98888-0000" />
          </label>
          <label className="text-xs font-semibold text-os-muted">
            E-mail
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="text-xs font-semibold text-os-muted">
            Origem
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className={`mt-1 ${field}`}>
              {OPPORTUNITY_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-os-muted">
            Prioridade
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={`mt-1 ${field}`}>
              {OPPORTUNITY_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-os-muted">
            Valor estimado (R$)
            <input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} className={`mt-1 ${field}`} placeholder="1500" />
          </label>
          <label className="text-xs font-semibold text-os-muted">
            Data da próxima ação
            <input type="date" value={form.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="text-xs font-semibold text-os-muted sm:col-span-2">
            Próxima ação
            <input value={form.nextAction} onChange={(e) => set("nextAction", e.target.value)} className={`mt-1 ${field}`} placeholder="Ligar para agendar diagnóstico" />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted transition hover:bg-os-bg">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar oportunidade
          </button>
        </div>
      </form>
    </div>
  );
}
