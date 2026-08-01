"use client";

import { useState, type ReactNode } from "react";

interface TabDef {
  id: string;
  label: string;
  comingSoon?: boolean;
}

const TABS: TabDef[] = [
  { id: "geral", label: "Visão Geral" },
  { id: "produtos", label: "Produtos" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "operacao", label: "Operação", comingSoon: true },
  { id: "tarefas", label: "Tarefas", comingSoon: true },
  { id: "reunioes", label: "Reuniões", comingSoon: true },
  { id: "contratos", label: "Contratos", comingSoon: true },
  { id: "financeiro", label: "Financeiro", comingSoon: true },
  { id: "documentos", label: "Documentos", comingSoon: true },
  { id: "historico", label: "Histórico" },
];

export function ClientTabs({ content }: { content: Record<string, ReactNode> }) {
  const [active, setActive] = useState("geral");

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-os-border bg-os-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            disabled={tab.comingSoon}
            onClick={() => !tab.comingSoon && setActive(tab.id)}
            title={tab.comingSoon ? "Em breve" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              tab.comingSoon
                ? "cursor-not-allowed text-os-muted/40"
                : active === tab.id
                  ? "bg-os-accent text-white"
                  : "text-os-muted hover:text-os-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {content[active]}
    </div>
  );
}
