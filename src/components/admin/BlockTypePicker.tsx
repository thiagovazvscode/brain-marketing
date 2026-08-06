"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CheckSquare,
  ClipboardCheck,
  Clock3,
  FileText,
  Flag,
  GitBranch,
  Package,
  Send,
  Upload,
  Users,
} from "lucide-react";
import { ClipboardList } from "lucide-react";
import { PLAYBOOK_BLOCK_CATEGORIES, PLAYBOOK_BLOCK_TYPES, type PlaybookBlockTypeId } from "@/lib/methods";

const ICONS: Record<PlaybookBlockTypeId, typeof ClipboardList> = {
  internal_task: ClipboardList,
  client_request: Send,
  checklist: CheckSquare,
  meeting: Users,
  form_briefing: FileText,
  document: Upload,
  analysis: BarChart3,
  deliverable: Package,
  approval: ClipboardCheck,
  wait: Clock3,
  milestone: Flag,
  condition: GitBranch,
};

// Cor discreta por tipo — só em ícone/badge/marca lateral (regra do pedido:
// verde da Brain fica exclusivo de seleção/ação primária/sucesso). Análise
// usa azul-violeta (indigo); Entregável usa azul profundo ("navy"), uma
// identidade nova e discreta das outras já ativas.
const COLOR_STYLE: Record<string, { chip: string; badge: string; border: string }> = {
  violet: { chip: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700", border: "hover:border-violet-300" },
  blue: { chip: "bg-blue-100 text-blue-700", badge: "bg-blue-50 text-blue-700", border: "hover:border-blue-300" },
  teal: { chip: "bg-teal-100 text-teal-700", badge: "bg-teal-50 text-teal-700", border: "hover:border-teal-300" },
  orange: { chip: "bg-orange-100 text-orange-700", badge: "bg-orange-50 text-orange-700", border: "hover:border-orange-300" },
  pink: { chip: "bg-pink-100 text-pink-700", badge: "bg-pink-50 text-pink-700", border: "hover:border-pink-300" },
  slate: { chip: "bg-slate-100 text-slate-600", badge: "bg-slate-50 text-slate-600", border: "hover:border-slate-300" },
  indigo: { chip: "bg-indigo-100 text-indigo-700", badge: "bg-indigo-50 text-indigo-700", border: "hover:border-indigo-300" },
  navy: { chip: "bg-blue-200 text-blue-900", badge: "bg-blue-100 text-blue-900", border: "hover:border-blue-500" },
};

export function BlockTypePicker({
  onCancel,
  onSelect,
}: {
  onCancel: () => void;
  onSelect: (type: "internal_task" | "client_request" | "checklist" | "meeting" | "form_briefing" | "document" | "analysis" | "deliverable") => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PLAYBOOK_BLOCK_TYPES;
    return PLAYBOOK_BLOCK_TYPES.filter(
      (t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [query]);

  const byCategory = PLAYBOOK_BLOCK_CATEGORIES.map((cat) => ({
    ...cat,
    types: filtered.filter((t) => t.category === cat.id),
  })).filter((cat) => cat.types.length > 0);

  const countByCategory = (categoryId: string) => PLAYBOOK_BLOCK_TYPES.filter((t) => t.category === categoryId).length;

  function scrollToCategory(categoryId: string) {
    document.getElementById(`block-category-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-os-border bg-os-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar bloco"
      >
        {/* Categorias — navegação lateral discreta, não é filtro exclusivo */}
        <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-os-border bg-os-bg/40 p-3 sm:flex">
          {PLAYBOOK_BLOCK_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold text-os-muted hover:bg-os-card hover:text-os-ink"
            >
              {cat.label}
              <span className="rounded-full bg-os-bg px-1.5 py-0.5 text-[10px] text-os-muted">{countByCategory(cat.id)}</span>
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-os-border p-5">
            <div>
              <h3 className="text-base font-black text-os-ink">Adicionar bloco</h3>
              <p className="mt-0.5 text-xs text-os-muted">Escolha o tipo de bloco que deseja adicionar ao playbook.</p>
            </div>
            <button onClick={onCancel} className="text-sm font-semibold text-os-muted hover:text-os-ink">
              Fechar
            </button>
          </div>

          <div className="border-b border-os-border p-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              autoFocus
              className="w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {byCategory.length === 0 && (
              <p className="py-10 text-center text-sm text-os-muted">Nenhum tipo de bloco encontrado para &quot;{query}&quot;.</p>
            )}
            <div className="space-y-6">
              {byCategory.map((cat) => (
                <div key={cat.id} id={`block-category-${cat.id}`}>
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-os-muted">{cat.label}</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {cat.types.map((t) => {
                      const Icon = ICONS[t.id];
                      const style = COLOR_STYLE[t.color] ?? COLOR_STYLE.slate;
                      if (!t.active) {
                        return (
                          <div
                            key={t.id}
                            aria-disabled="true"
                            className="flex cursor-not-allowed flex-col gap-1.5 rounded-xl border border-os-border/60 p-3 text-left opacity-60"
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-os-bg text-os-muted">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="rounded-full bg-os-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-os-muted/70">
                                Em breve
                              </span>
                            </div>
                            <span className="text-xs font-bold text-os-ink">{t.label}</span>
                            <span className="text-[11px] text-os-muted">{t.description}</span>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={t.id}
                          onClick={() => onSelect(t.id as never)}
                          className={`flex flex-col gap-1.5 rounded-xl border border-os-border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-accent ${style.border} hover:bg-os-accent-soft/20`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-md ${style.chip}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style.badge}`}>
                              Disponível
                            </span>
                          </div>
                          <span className="text-xs font-bold text-os-ink">{t.label}</span>
                          <span className="text-[11px] text-os-muted">{t.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-os-border p-4">
            <p className="text-[11px] text-os-muted">Dica: você pode reordenar os blocos depois de adicioná-los.</p>
            <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
