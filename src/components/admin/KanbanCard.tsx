"use client";

import { AlertTriangle, CalendarClock, User, Flag } from "lucide-react";
import type { KanbanOpportunity } from "@/types/crm";
import { daysInStage, isStuck } from "@/lib/crm";

const PRIORITY_STYLE: Record<string, string> = {
  baixa: "bg-slate-100 text-slate-600",
  media: "bg-sky-100 text-sky-700",
  alta: "bg-amber-100 text-amber-700",
  urgente: "bg-red-100 text-red-700",
};

function formatCurrency(value: string | null) {
  if (!value) return null;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n === 0) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function KanbanCard({
  opportunity,
  stuckAfterDays,
  onDragStart,
  onClick,
}: {
  opportunity: KanbanOpportunity;
  stuckAfterDays: number;
  onDragStart: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const dias = daysInStage(opportunity.stageEnteredAt);
  const parada = isStuck(opportunity.stageEnteredAt, stuckAfterDays, opportunity.status);
  const valor = formatCurrency(opportunity.estimatedValue);
  const proximaData = formatDate(opportunity.nextActionDate);

  // Próxima ação vencida é diferente de oportunidade parada: uma é compromisso
  // que passou da data, a outra é o card estagnado na etapa. Sinalizo as duas.
  const acaoVencida =
    opportunity.nextActionDate && new Date(opportunity.nextActionDate) < new Date(new Date().toDateString());

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", opportunity.id);
        onDragStart(opportunity.id);
      }}
      onClick={() => onClick(opportunity.id)}
      className={`group cursor-grab rounded-xl border bg-os-card p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
        parada ? "border-amber-300" : "border-os-border"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-tight text-os-ink">
          {opportunity.companyName || opportunity.contactName || opportunity.title}
        </p>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            PRIORITY_STYLE[opportunity.priority] ?? PRIORITY_STYLE.media
          }`}
        >
          {opportunity.priority}
        </span>
      </div>

      {opportunity.companyName && opportunity.contactName && (
        <p className="mb-2 truncate text-xs text-os-muted">{opportunity.contactName}</p>
      )}

      {opportunity.productNames.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {opportunity.productNames.slice(0, 2).map((name) => (
            <span key={name} className="rounded bg-os-bg px-1.5 py-0.5 text-[10px] font-medium text-os-muted">
              {name}
            </span>
          ))}
          {opportunity.productNames.length > 2 && (
            <span className="rounded bg-os-bg px-1.5 py-0.5 text-[10px] font-medium text-os-muted">
              +{opportunity.productNames.length - 2}
            </span>
          )}
        </div>
      )}

      {valor && (
        <p className="mb-2 text-sm font-black tabular-nums text-os-ink">
          {valor}
          <span className="ml-1.5 text-[10px] font-semibold text-os-muted">{opportunity.probability}%</span>
        </p>
      )}

      {opportunity.nextAction && (
        <p
          className={`mb-2 flex items-start gap-1 text-[11px] leading-snug ${
            acaoVencida ? "font-semibold text-red-600" : "text-os-muted"
          }`}
        >
          <CalendarClock className="mt-px h-3 w-3 shrink-0" />
          <span className="truncate">
            {opportunity.nextAction}
            {proximaData && <span className="ml-1 font-semibold">{proximaData}</span>}
          </span>
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-os-border pt-2 text-[10px] text-os-muted">
        <span className="flex min-w-0 items-center gap-1">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{opportunity.ownerName || opportunity.ownerEmail || "Sem responsável"}</span>
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 font-semibold ${parada ? "text-amber-600" : ""}`}
          title={parada ? `Parada há ${dias} dias nesta etapa` : `${dias} dia(s) nesta etapa`}
        >
          {parada ? <AlertTriangle className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
          {dias}d
        </span>
      </div>
    </article>
  );
}
