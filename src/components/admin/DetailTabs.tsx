"use client";

import { useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  comingSoon?: boolean;
}

// Generaliza o padrão de ClientTabs.tsx — reaproveitado no hub de Métodos &
// Execução e nos detalhes de método/playbook, em vez de reimplementar o
// mesmo componente de abas em cada tela.
export function DetailTabs({
  tabs,
  content,
  defaultTab,
}: {
  tabs: TabDef[];
  content: Record<string, ReactNode>;
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-os-border bg-os-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            disabled={tab.comingSoon}
            onClick={() => !tab.comingSoon && setActive(tab.id)}
            title={tab.comingSoon ? "Próxima etapa" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              tab.comingSoon
                ? "cursor-not-allowed text-os-muted/40"
                : active === tab.id
                  ? "bg-os-accent text-white"
                  : "text-os-muted hover:text-os-ink"
            }`}
          >
            {tab.label}
            {tab.comingSoon && (
              <span className="rounded-full bg-os-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-os-muted/70">
                Próxima etapa
              </span>
            )}
          </button>
        ))}
      </div>
      {content[active]}
    </div>
  );
}
