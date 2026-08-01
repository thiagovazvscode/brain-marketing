"use client";

import { useState, type ReactNode } from "react";
import { Activity, Link2, Users } from "lucide-react";

const TABS = [
  { id: "operacao", label: "Operação", icon: Activity },
  { id: "links", label: "Links e Páginas", icon: Link2 },
  { id: "leads", label: "Leads e Conversão", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DashboardTabs({ operacao, links, leads }: { operacao: ReactNode; links: ReactNode; leads: ReactNode }) {
  const [active, setActive] = useState<TabId>("operacao");
  const content = { operacao, links, leads }[active];

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-xl border border-os-border bg-os-card/50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                active === tab.id ? "bg-os-accent text-white" : "text-os-muted hover:text-os-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      {content}
    </div>
  );
}
