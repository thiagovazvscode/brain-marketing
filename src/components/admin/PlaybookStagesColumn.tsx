"use client";

import { useState } from "react";
import { GripVertical, MoreVertical, Plus, Settings, AlertTriangle, CheckCircle2, Circle, HelpCircle } from "lucide-react";
import Link from "next/link";
import type { PlaybookStageRow } from "@/types/methods";
import { durationUnitLabel } from "@/lib/methods";

const STATUS_ICON: Record<PlaybookStageRow["configStatus"], { icon: typeof Circle; className: string }> = {
  completa: { icon: CheckCircle2, className: "text-os-accent" },
  incompleta: { icon: Circle, className: "text-os-muted/50" },
  alerta: { icon: AlertTriangle, className: "text-os-warning" },
  sem_configuracao: { icon: HelpCircle, className: "text-os-muted/50" },
};

export function PlaybookStagesColumn({
  playbookId,
  stages,
  selectedStageId,
  onSelect,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  playbookId: string;
  stages: PlaybookStageRow[];
  selectedStageId: string | null;
  onSelect: (stageId: string) => void;
  onCreate: () => void;
  onEdit: (stageId: string) => void;
  onDuplicate: (stageId: string) => void;
  onDelete: (stageId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const totalDuration = stages.reduce((sum, s) => sum + (s.durationValue ?? 0), 0);
  const totalBlocks = stages.reduce((sum, s) => sum + s.blocks.length, 0);

  function handleDrop(targetId: string) {
    setOverId(null);
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = stages.map((s) => s.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorder(ids);
  }

  return (
    <div className="flex w-full min-w-0 flex-col rounded-2xl border border-os-border bg-os-card p-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold text-os-ink">Etapas do Playbook</h2>
      </div>
      <button
        onClick={onCreate}
        className="mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-os-border py-1.5 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
      >
        <Plus className="h-3.5 w-3.5" /> Nova etapa
      </button>
      {stages.length > 1 && <p className="mb-2 text-center text-[10px] text-os-muted/70">Arraste para reordenar</p>}

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {stages.map((stage, index) => {
          const Status = STATUS_ICON[stage.configStatus];
          const isSelected = stage.id === selectedStageId;
          const isOver = overId === stage.id;

          return (
            <div
              key={stage.id}
              draggable
              onDragStart={() => setDraggingId(stage.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(stage.id);
              }}
              onDragLeave={() => setOverId((cur) => (cur === stage.id ? null : cur))}
              onDrop={() => handleDrop(stage.id)}
              onClick={() => onSelect(stage.id)}
              className={`group relative flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 pl-3.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-accent ${
                isSelected ? "border-os-accent bg-os-accent-soft/30" : isOver ? "border-os-accent/60" : "border-os-border hover:bg-os-bg/60"
              }`}
            >
              {isSelected && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-os-accent" aria-hidden />}
              <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-os-bg text-[10px] font-bold text-os-muted">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-os-ink">{stage.name || "Sem nome"}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[10px] text-os-muted">
                  {stage.durationValue != null && (
                    <span>
                      {stage.durationValue} {durationUnitLabel(stage.durationUnit)}
                    </span>
                  )}
                  <span>
                    {stage.blocks.length} {stage.blocks.length === 1 ? "bloco" : "blocos"}
                  </span>
                </p>
              </div>
              <Status.icon className={`mt-0.5 h-4 w-4 shrink-0 ${Status.className}`} />
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((cur) => (cur === stage.id ? null : stage.id));
                  }}
                  className="text-os-muted hover:text-os-ink"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenuId === stage.id && (
                  <div
                    className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-os-border bg-os-card py-1 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onEdit(stage.id);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg"
                    >
                      Abrir / editar
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onDuplicate(stage.id);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg"
                    >
                      Duplicar
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onDelete(stage.id);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-os-bg"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-os-border pt-3 text-[11px] text-os-muted">
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
          <span>{stages.length} etapas</span>
          <span>{totalDuration} dias úteis (aprox.)</span>
          <span>{totalBlocks} blocos</span>
        </div>
        <Link
          href={`/admin/playbooks/${playbookId}/editar`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-os-border py-1.5 text-xs font-bold text-os-ink hover:border-os-accent"
        >
          <Settings className="h-3.5 w-3.5" /> Configurações do Playbook
        </Link>
      </div>
    </div>
  );
}
