"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MoreVertical, Workflow } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { playbookTypeLabel } from "@/lib/methods";
import type { PlaybookSummary } from "@/types/methods";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function PlaybookCard({ playbook }: { playbook: PlaybookSummary }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    try {
      await fetch(`/api/admin/playbooks/${playbook.id}/duplicate`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      await fetch(`/api/admin/playbooks/${playbook.id}/archive`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-os-border bg-os-card p-5 transition hover:border-os-accent/40">
      <div className="mb-3 flex items-start justify-between gap-2">
        <StatusBadge status={playbook.status} />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            disabled={busy}
            className="rounded-lg p-1 text-os-muted hover:bg-os-bg hover:text-os-ink"
            aria-label="Ações"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-os-border bg-os-card shadow-lg">
              <Link href={`/admin/playbooks/${playbook.id}`} className="block px-4 py-2 text-sm font-medium text-os-ink hover:bg-os-bg">
                Abrir
              </Link>
              <Link href={`/admin/playbooks/${playbook.id}/editar`} className="block px-4 py-2 text-sm font-medium text-os-ink hover:bg-os-bg">
                Editar
              </Link>
              <button onClick={duplicate} className="block w-full px-4 py-2 text-left text-sm font-medium text-os-ink hover:bg-os-bg">
                Duplicar
              </button>
              {playbook.status !== "arquivado" && (
                <button onClick={archive} className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-os-bg">
                  Arquivar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Link href={`/admin/playbooks/${playbook.id}`} className="min-w-0">
        <h3 className="truncate font-display text-sm font-bold text-os-ink">{playbook.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-os-muted">{playbook.description ?? "Sem descrição."}</p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-semibold text-os-muted">{playbook.productName}</span>
        <span className="rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-semibold text-os-muted">{playbook.methodName}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-os-border pt-3 text-[11px] text-os-muted">
        <span className="flex items-center gap-1">
          <Workflow className="h-3 w-3" />
          {playbookTypeLabel(playbook.type)}
        </span>
        {playbook.defaultDurationDays != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {playbook.defaultDurationDays} dias
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-os-muted">
        <span>v{playbook.version} · {playbook.authorName ?? "Sem autor"}</span>
        <span>Atualizado {formatDate(playbook.updatedAt)}</span>
      </div>
    </div>
  );
}
