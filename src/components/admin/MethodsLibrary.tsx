"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { MethodCard } from "@/components/admin/MethodCard";
import { CONTENT_STATUS } from "@/lib/methods";
import type { MethodSummary } from "@/types/methods";

const selectClass =
  "rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink focus:border-os-accent focus:outline-none";

export function MethodsLibrary({ methods }: { methods: MethodSummary[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState("");
  const [author, setAuthor] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(methods.map((m) => m.category).filter((c): c is string => Boolean(c)))).sort(),
    [methods]
  );
  const productNames = useMemo(
    () => Array.from(new Set(methods.flatMap((m) => m.productNames))).sort(),
    [methods]
  );
  const authors = useMemo(
    () =>
      Array.from(
        new Map(methods.filter((m) => m.authorId).map((m) => [m.authorId as string, m.authorName ?? "Sem nome"])).entries()
      ),
    [methods]
  );

  const filtered = methods.filter((m) => {
    if (status && m.status !== status) return false;
    if (category && m.category !== category) return false;
    if (product && !m.productNames.includes(product)) return false;
    if (author && m.authorId !== author) return false;
    if (query) {
      const q = query.toLowerCase();
      const haystack = `${m.name} ${m.shortDescription ?? ""}`.toLowerCase();
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
        <Link
          href="/admin/metodos/novo"
          className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Novo método
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <select value={product} onChange={(e) => setProduct(e.target.value)} className={selectClass}>
          <option value="">Todos os produtos</option>
          {productNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
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
        <select value={author} onChange={(e) => setAuthor(e.target.value)} className={selectClass}>
          <option value="">Todos os autores</option>
          {authors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-os-border bg-os-card/30 p-10 text-center">
          <p className="text-sm font-semibold text-os-ink">
            {methods.length === 0 ? "Nenhum método cadastrado ainda." : "Nenhum método encontrado com esses filtros."}
          </p>
          <p className="mt-1 text-xs text-os-muted">
            {methods.length === 0
              ? "Crie o primeiro método para começar a padronizar os processos da Brain."
              : "Ajuste a busca ou os filtros acima."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((method) => (
            <MethodCard key={method.id} method={method} />
          ))}
        </div>
      )}
    </div>
  );
}
