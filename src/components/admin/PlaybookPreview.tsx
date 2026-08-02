"use client";

import { X } from "lucide-react";
import type { PlaybookStageRow } from "@/types/methods";
import { durationUnitLabel, playbookBlockTypeLabel } from "@/lib/methods";

// Somente leitura — não confundir com aplicação a um cliente (Etapa 3).
export function PlaybookPreview({
  playbookName,
  version,
  stages,
  onClose,
}: {
  playbookName: string;
  version: string;
  stages: PlaybookStageRow[];
  onClose: () => void;
}) {
  const totalDuration = stages.reduce((sum, s) => sum + (s.durationValue ?? 0), 0);
  const totalBlocks = stages.reduce((sum, s) => sum + s.blocks.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-os-ink">{playbookName}</h3>
            <p className="text-xs text-os-muted">Versão {version} · Pré-visualização somente leitura</p>
          </div>
          <button onClick={onClose} className="text-os-muted hover:text-os-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-os-muted">
          <span>{stages.length} etapas</span>
          <span>{totalBlocks} blocos</span>
          <span>{totalDuration} dias úteis (aprox.)</span>
        </div>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="rounded-xl border border-os-border p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-os-muted">Etapa {index + 1}</p>
                  <p className="text-sm font-bold text-os-ink">{stage.name}</p>
                  {stage.objective && <p className="mt-0.5 text-xs text-os-muted">{stage.objective}</p>}
                </div>
                {stage.durationValue != null && (
                  <span className="shrink-0 rounded-full border border-os-border px-2 py-0.5 text-[11px] font-semibold text-os-muted">
                    {stage.durationValue} {durationUnitLabel(stage.durationUnit)}
                  </span>
                )}
              </div>
              {stage.blocks.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {stage.blocks.map((block) => (
                    <li key={block.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-os-bg/60 px-3 py-2 text-xs">
                      <span className="font-semibold text-os-ink">{block.title}</span>
                      <span className="text-os-muted">{playbookBlockTypeLabel(block.type)}</span>
                      {block.dueOffsetValue != null && (
                        <span className="text-os-muted">
                          +{block.dueOffsetValue} {durationUnitLabel(block.dueOffsetUnit)}
                        </span>
                      )}
                      {block.isRequired && <span className="font-semibold text-os-accent">Obrigatória</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
