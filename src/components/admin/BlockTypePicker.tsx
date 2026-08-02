"use client";

import { CheckSquare, ClipboardCheck, FileText, Flag, GitBranch, Send, Timer, Trophy, Upload, Users } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { PLAYBOOK_BLOCK_TYPES, type PlaybookBlockTypeId } from "@/lib/methods";

const ICONS: Record<PlaybookBlockTypeId, typeof ClipboardList> = {
  internal_task: ClipboardList,
  client_request: Send,
  meeting: Users,
  checklist: CheckSquare,
  form_briefing: FileText,
  document: Upload,
  analysis: ClipboardCheck,
  deliverable: Trophy,
  approval: ClipboardCheck,
  wait: Timer,
  milestone: Flag,
  condition: GitBranch,
};

const DESCRIPTIONS: Partial<Record<PlaybookBlockTypeId, string>> = {
  internal_task: "Atividade executada pela equipe da Brain.",
  client_request: "Algo que o cliente precisa enviar, responder ou executar.",
};

// Grade de tipos — só 2 clicáveis nesta rodada (Fase 2.1); os outros ficam
// desabilitados com rótulo de próxima entrega. Nunca dados falsos pros
// tipos ainda não implementados (regra explícita do pedido).
export function BlockTypePicker({ onCancel, onSelect }: { onCancel: () => void; onSelect: (type: "internal_task" | "client_request") => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-os-ink">Adicionar bloco</h3>
          <button onClick={onCancel} className="text-sm font-semibold text-os-muted hover:text-os-ink">
            Fechar
          </button>
        </div>
        <p className="mb-3 text-xs text-os-muted">Selecione o tipo de bloco que deseja adicionar à etapa.</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLAYBOOK_BLOCK_TYPES.map((t) => {
            const Icon = ICONS[t.id];
            return (
              <button
                key={t.id}
                disabled={!t.active}
                onClick={() => t.active && onSelect(t.id as "internal_task" | "client_request")}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition ${
                  t.active
                    ? "border-os-border hover:border-os-accent hover:bg-os-accent-soft/30"
                    : "cursor-not-allowed border-os-border/60 opacity-50"
                }`}
              >
                <Icon className="h-4 w-4 text-os-accent" />
                <span className="text-xs font-bold text-os-ink">{t.label}</span>
                {t.active ? (
                  DESCRIPTIONS[t.id] && <span className="text-[11px] text-os-muted">{DESCRIPTIONS[t.id]}</span>
                ) : (
                  <span className="rounded-full bg-os-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-os-muted/70">
                    Próxima entrega
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
