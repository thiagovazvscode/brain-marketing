"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Layers, Workflow } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { MethodSummary } from "@/types/methods";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function MethodCard({ method }: { method: MethodSummary }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    try {
      await fetch(`/api/admin/methods/${method.id}/duplicate`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      await fetch(`/api/admin/methods/${method.id}/archive`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-os-border bg-os-card p-5 transition hover:border-os-accent/40">
      <div className="mb-3 flex items-start justify-between gap-2">
        <StatusBadge status={method.status} />
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
              <Link href={`/admin/metodos/${method.id}`} className="block px-4 py-2 text-sm font-medium text-os-ink hover:bg-os-bg">
                Abrir
              </Link>
              <Link href={`/admin/metodos/${method.id}/editar`} className="block px-4 py-2 text-sm font-medium text-os-ink hover:bg-os-bg">
                Editar
              </Link>
              <button onClick={duplicate} className="block w-full px-4 py-2 text-left text-sm font-medium text-os-ink hover:bg-os-bg">
                Duplicar
              </button>
              <Link
                href={`/admin/playbooks/novo?methodId=${method.id}`}
                className="block px-4 py-2 text-sm font-medium text-os-ink hover:bg-os-bg"
              >
                Criar playbook
              </Link>
              {method.status !== "arquivado" && (
                <button onClick={archive} className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-os-bg">
                  Arquivar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Link href={`/admin/metodos/${method.id}`} className="min-w-0">
        <h3 className="truncate font-display text-sm font-bold text-os-ink">{method.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-os-muted">{method.shortDescription ?? "Sem descrição curta."}</p>
      </Link>

      {method.productNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {method.productNames.map((name) => (
            <span key={name} className="rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-semibold text-os-muted">
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-os-border pt-3 text-[11px] text-os-muted">
        <span className="flex items-center gap-1">
          <Workflow className="h-3 w-3" />
          {method.category ?? "Sem categoria"}
        </span>
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {method.playbookCount} playbook{method.playbookCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-os-muted">
        <span>v{method.version} · {method.authorName ?? "Sem autor"}</span>
        <span>Atualizado {formatDate(method.updatedAt)}</span>
      </div>
    </div>
  );
}
