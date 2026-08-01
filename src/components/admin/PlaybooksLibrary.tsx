"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { PlaybookCard } from "@/components/admin/PlaybookCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CONTENT_STATUS, PLAYBOOK_TYPES, playbookTypeLabel } from "@/lib/methods";
import type { PlaybookSummary } from "@/types/methods";

const selectClass =
  "rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink focus:border-os-accent focus:outline-none";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function PlaybooksLibrary({ playbooks }: { playbooks: PlaybookSummary[] }) {
  const [view, setView] = useState<"cards" | "tabela">("cards");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [product, setProduct] = useState("");
  const [method, setMethod] = useState("");

  const products = useMemo(() => Array.from(new Map(playbooks.map((p) => [p.productId, p.productName])).entries()), [playbooks]);
  const methods = useMemo(() => Array.from(new Map(playbooks.map((p) => [p.methodId, p.methodName])).entries()), [playbooks]);

  const filtered = playbooks.filter((p) => {
    if (status && p.status !== status) return false;
    if (type && p.type !== type) return false;
    if (product && p.productId !== product) return false;
    if (method && p.methodId !== method) return false;
    if (query) {
      const q = query.toLowerCase();
      const haystack = `${p.name} ${p.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-os-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full rounded-lg border border-os-border bg-os-bg/60 py-2 pl-9 pr-3 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-os-border p-0.5">
            <button
              onClick={() => setView("cards")}
              className={`rounded-md p-1.5 ${view === "cards" ? "bg-os-accent text-white" : "text-os-muted"}`}
              aria-label="Visualizar em cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("tabela")}
              className={`rounded-md p-1.5 ${view === "tabela" ? "bg-os-accent text-white" : "text-os-muted"}`}
              aria-label="Visualizar em tabela"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/admin/playbooks/novo"
            className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Novo playbook
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <select value={product} onChange={(e) => setProduct(e.target.value)} className={selectClass}>
          <option value="">Todos os produtos</option>
          {products.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectClass}>
          <option value="">Todos os métodos</option>
          {methods.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
          <option value="">Todos os tipos</option>
          {PLAYBOOK_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="">Todos os status</option>
          {CONTENT_STATUS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-os-border bg-os-card/30 p-10 text-center">
          <p className="text-sm font-semibold text-os-ink">
            {playbooks.length === 0 ? "Nenhum playbook cadastrado ainda." : "Nenhum playbook encontrado com esses filtros."}
          </p>
          <p className="mt-1 text-xs text-os-muted">
            {playbooks.length === 0 ? "Crie um playbook a partir de um método publicado." : "Ajuste a busca ou os filtros acima."}
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((playbook) => (
            <PlaybookCard key={playbook.id} playbook={playbook} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-os-border bg-os-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-os-border text-[11px] font-bold uppercase tracking-wide text-os-muted">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Versão</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-os-border last:border-0 hover:bg-os-bg/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/playbooks/${p.id}`} className="font-semibold text-os-ink hover:text-os-accent">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-os-muted">{p.productName}</td>
                  <td className="px-4 py-3 text-os-muted">{p.methodName}</td>
                  <td className="px-4 py-3 text-os-muted">{playbookTypeLabel(p.type)}</td>
                  <td className="px-4 py-3 text-os-muted">v{p.version}</td>
                  <td className="px-4 py-3 text-os-muted">{p.defaultDurationDays != null ? `${p.defaultDurationDays} dias` : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-os-muted">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
