"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, Phone, Mail, MessageCircle, Plus } from "lucide-react";
import { ACTIVITY_TYPES, activityTypeLabel, sourceLabel, lossReasonLabel, daysInStage } from "@/lib/crm";

interface Detail {
  opportunity: Record<string, unknown> & {
    id: string; title: string; contactName: string | null; companyName: string | null;
    phone: string | null; whatsapp: string | null; email: string | null; source: string | null;
    estimatedValue: string | null; probability: number; priority: string; status: string;
    stageEnteredAt: string; nextAction: string | null; nextActionDate: string | null;
    expectedCloseDate: string | null; notes: string | null; lostReason: string | null; lostNotes: string | null;
  };
  products: { id: string; productName: string; planName: string | null; estimatedValue: string | null }[];
  activities: { id: string; type: string; title: string; description: string | null; doneAt: string | null; createdAt: string }[];
  history: { id: string; toStageName: string; note: string | null; changedAt: string }[];
  documents: { id: string; title: string; url: string; category: string }[];
}

const TABS = [
  { id: "dados", label: "Dados" },
  { id: "produtos", label: "Produtos" },
  { id: "atividades", label: "Atividades" },
  { id: "historico", label: "Histórico" },
] as const;

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}
function fmtMoney(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

export function OpportunityDetailPanel({
  opportunityId,
  onClose,
}: {
  opportunityId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("dados");
  const [novaAtividade, setNovaAtividade] = useState({ type: "nota", title: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/opportunities/${opportunityId}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function registrarAtividade(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAtividade.title.trim()) return;
    setSalvando(true);
    try {
      await fetch(`/api/admin/opportunities/${opportunityId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaAtividade),
      });
      setNovaAtividade({ type: "nota", title: "" });
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  const opp = data?.opportunity;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-os-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-os-border p-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-os-ink">
              {loading ? "Carregando..." : opp?.companyName || opp?.contactName || opp?.title}
            </h2>
            {opp && (
              <p className="mt-0.5 text-xs text-os-muted">
                {fmtMoney(opp.estimatedValue)} · {opp.probability}% · há {daysInStage(opp.stageEnteredAt)} dia(s) nesta etapa
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-os-muted transition hover:bg-os-bg">
            <X className="h-5 w-5" />
          </button>
        </header>

        {opp && (
          <div className="flex gap-2 border-b border-os-border px-5 py-2">
            {opp.whatsapp && (
              <a href={`https://wa.me/${opp.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 rounded-lg bg-os-accent-soft px-2.5 py-1.5 text-xs font-bold text-os-ink">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {opp.phone && (
              <a href={`tel:${opp.phone}`} className="flex items-center gap-1.5 rounded-lg bg-os-bg px-2.5 py-1.5 text-xs font-bold text-os-ink">
                <Phone className="h-3.5 w-3.5" /> Ligar
              </a>
            )}
            {opp.email && (
              <a href={`mailto:${opp.email}`} className="flex items-center gap-1.5 rounded-lg bg-os-bg px-2.5 py-1.5 text-xs font-bold text-os-ink">
                <Mail className="h-3.5 w-3.5" /> E-mail
              </a>
            )}
          </div>
        )}

        <nav className="flex gap-1 border-b border-os-border px-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                tab === t.id ? "border-os-accent text-os-ink" : "border-transparent text-os-muted hover:text-os-ink"
              }`}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-os-muted" />}

          {!loading && opp && tab === "dados" && (
            <dl className="space-y-2.5 text-sm">
              {[
                ["Contato", opp.contactName],
                ["Empresa", opp.companyName],
                ["Telefone", opp.phone],
                ["WhatsApp", opp.whatsapp],
                ["E-mail", opp.email],
                ["Origem", sourceLabel(opp.source)],
                ["Valor estimado", fmtMoney(opp.estimatedValue)],
                ["Probabilidade", `${opp.probability}%`],
                ["Prioridade", opp.priority],
                ["Próxima ação", opp.nextAction],
                ["Data da próxima ação", fmtDate(opp.nextActionDate)],
                ["Previsão de fechamento", fmtDate(opp.expectedCloseDate)],
                ["Observações", opp.notes],
              ].map(([label, value]) => (
                <div key={label as string} className="flex gap-3">
                  <dt className="w-44 shrink-0 text-os-muted">{label}</dt>
                  <dd className="text-os-ink">{(value as string) || "—"}</dd>
                </div>
              ))}
              {opp.lostReason && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold uppercase text-red-700">Perdida</p>
                  <p className="mt-1 text-sm text-red-800">{lossReasonLabel(opp.lostReason)}</p>
                  {opp.lostNotes && <p className="mt-1 text-xs text-red-700">{opp.lostNotes}</p>}
                </div>
              )}
            </dl>
          )}

          {!loading && tab === "produtos" && (
            <div className="space-y-2">
              {data?.products.length === 0 && (
                <p className="rounded-lg border border-dashed border-os-border px-3 py-6 text-center text-sm text-os-muted">
                  Nenhum produto de interesse registrado.
                </p>
              )}
              {data?.products.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-os-border px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-os-ink">{p.productName}</p>
                    {p.planName && <p className="text-xs text-os-muted">{p.planName}</p>}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-os-ink">{fmtMoney(p.estimatedValue)}</span>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "atividades" && (
            <>
              <form onSubmit={registrarAtividade} className="mb-4 flex gap-2">
                <select
                  value={novaAtividade.type}
                  onChange={(e) => setNovaAtividade((a) => ({ ...a, type: e.target.value }))}
                  className="rounded-lg border border-os-border bg-os-card px-2 py-2 text-xs text-os-ink focus:outline-none"
                >
                  {ACTIVITY_TYPES.filter((t) => !["mudanca-etapa", "venda"].includes(t.id)).map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <input
                  value={novaAtividade.title}
                  onChange={(e) => setNovaAtividade((a) => ({ ...a, title: e.target.value }))}
                  placeholder="O que aconteceu?"
                  className="flex-1 rounded-lg border border-os-border bg-os-card px-3 py-2 text-sm text-os-ink placeholder:text-os-muted focus:border-os-accent focus:outline-none"
                />
                <button disabled={salvando} className="rounded-lg bg-os-accent px-3 py-2 text-white disabled:opacity-60">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </form>

              <ol className="space-y-3">
                {data?.activities.map((a) => (
                  <li key={a.id} className="border-l-2 border-os-border pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-os-muted">
                      {activityTypeLabel(a.type)} · {new Date(a.createdAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm text-os-ink">{a.title}</p>
                    {a.description && <p className="text-xs text-os-muted">{a.description}</p>}
                  </li>
                ))}
                {data?.activities.length === 0 && (
                  <p className="text-center text-sm text-os-muted">Nenhuma atividade ainda.</p>
                )}
              </ol>
            </>
          )}

          {!loading && tab === "historico" && (
            <ol className="space-y-3">
              {data?.history.map((h) => (
                <li key={h.id} className="border-l-2 border-os-border pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-os-muted">
                    {new Date(h.changedAt).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-os-ink">{h.toStageName}</p>
                  {h.note && <p className="text-xs text-os-muted">{h.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
