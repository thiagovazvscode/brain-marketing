"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Mail, Phone } from "lucide-react";
import type { Lead, LeadStatus } from "@/types/tracking";

const STATUS_OPTIONS: { value: LeadStatus; label: string; dot: string; text: string }[] = [
  { value: "novo", label: "Novo", dot: "bg-slate-400", text: "text-slate-300" },
  { value: "contatado", label: "Contatado", dot: "bg-[#fab219]", text: "text-[#fab219]" },
  { value: "fechado", label: "Fechado", dot: "bg-[#0ca30c]", text: "text-[#0ca30c]" },
  { value: "perdido", label: "Perdido", dot: "bg-[#d03b3b]", text: "text-[#d03b3b]" },
];

const SOURCE_LABEL: Record<Lead["sourceType"], string> = {
  banner: "Banner do hub",
  "quiz-cta": "Quiz do hub",
  "homepage-contact": "Form da home",
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status)!;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${opt.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />
      {opt.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "todos">("todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/leads")
      .then((res) => res.json())
      .then((data) => {
        if (active) setLeads(data.leads ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => leads.filter((l) => statusFilter === "todos" || l.status === statusFilter),
    [leads, statusFilter]
  );

  async function updateStatus(id: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      // a UI já refletiu a mudança; falha silenciosa não deve travar o admin
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-os-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando leads...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-os-ink">Leads</h1>
          <p className="text-sm text-os-muted">{filtered.length} lead(s) nesse filtro.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "todos")}
          className="rounded-lg border border-os-border bg-os-card/60 px-3 py-2 text-xs font-bold text-os-ink focus:border-os-accent focus:outline-none"
        >
          <option value="todos">Todos os status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-os-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-os-border bg-os-card/60 text-left text-xs uppercase tracking-wide text-os-muted">
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Serviço</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const isOpen = expanded === lead.id;
              const hasDetail = Boolean(lead.quizAnswers?.length || lead.utmCampaign);
              return (
                <Fragment key={lead.id}>
                  <tr className="border-b border-os-border/60 bg-os-card/20 hover:bg-os-bg/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-os-ink">{lead.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-os-muted">
                        <Phone className="h-3 w-3" /> {lead.phone}
                        {lead.email && (
                          <>
                            <span className="mx-1 text-line">·</span>
                            <Mail className="h-3 w-3" /> {lead.email}
                          </>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-os-muted">{SOURCE_LABEL[lead.sourceType]}</td>
                    <td className="px-4 py-3 text-xs text-os-ink/80">{lead.service ?? "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-os-muted">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                        className="rounded-lg border border-os-border bg-os-bg/60 px-2 py-1 text-xs font-bold text-os-ink focus:border-os-accent focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1">
                        <StatusBadge status={lead.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasDetail && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : lead.id)}
                          className="text-os-muted hover:text-os-ink"
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && hasDetail && (
                    <tr className="border-b border-os-border/60 bg-os-bg/40">
                      <td colSpan={6} className="px-4 py-4">
                        {lead.utmCampaign && (
                          <p className="mb-2 text-xs text-os-muted">
                            UTM: <span className="text-os-ink/80">{lead.utmSource}</span> /{" "}
                            <span className="text-os-ink/80">{lead.utmMedium}</span> /{" "}
                            <span className="text-os-ink/80">{lead.utmCampaign}</span>
                          </p>
                        )}
                        {lead.quizAnswers && (
                          <ol className="list-decimal space-y-1 pl-4 text-xs text-os-ink/80">
                            {lead.quizAnswers.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ol>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
