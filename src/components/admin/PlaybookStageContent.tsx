"use client";

import { useState } from "react";
import { GripVertical, MoreVertical, Plus, Send, ClipboardList, Lock } from "lucide-react";
import type { PlaybookStageRow, PlaybookBlockRow, SimpleOption } from "@/types/methods";
import { durationUnitLabel, playbookAssigneeRoleLabel, playbookBlockPriorityLabel, playbookBlockTypeLabel } from "@/lib/methods";
import { EmptyBlocksPlaceholder } from "@/components/admin/EmptyBlocksPlaceholder";

// Roxo (tarefa interna) e azul (solicitação ao cliente) — cor reservada só
// pra diferenciar tipo. Verde (os-accent) fica exclusivo de seleção/sucesso.
const TYPE_STYLE: Record<string, { badge: string; chip: string }> = {
  internal_task: { badge: "bg-violet-100 text-violet-700", chip: "bg-violet-100 text-violet-600" },
  client_request: { badge: "bg-blue-100 text-blue-700", chip: "bg-blue-100 text-blue-600" },
};

const PRIORITY_DOT: Record<string, string> = {
  baixa: "text-os-muted",
  media: "text-os-muted",
  alta: "text-amber-600",
  critica: "text-red-600",
};

function BlockRow({
  block,
  index,
  isSelected,
  assigneeLabel,
  onSelect,
  onDuplicate,
  onDelete,
  dragProps,
}: {
  block: PlaybookBlockRow;
  index: number;
  isSelected: boolean;
  assigneeLabel: string | null;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = block.type === "client_request" ? Send : ClipboardList;
  const style = TYPE_STYLE[block.type] ?? { badge: "bg-os-bg text-os-muted", chip: "bg-os-bg text-os-muted" };

  return (
    <div
      {...dragProps}
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border py-3 pl-4 pr-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-accent ${
        isSelected ? "border-os-accent bg-os-accent-soft/30" : "border-os-border hover:bg-os-bg/60"
      }`}
    >
      {isSelected && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-os-accent" aria-hidden />}

      <div className="flex items-center gap-2.5">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-os-bg text-[10px] font-bold text-os-muted">
          {index + 1}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${style.chip}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-os-ink">{block.title || "Sem título"}</p>
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Mais ações do bloco"
            className="text-os-muted hover:text-os-ink"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-os-border bg-os-card py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <button onClick={onSelect} className="block w-full px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg">
                Editar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg"
              >
                Duplicar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-os-bg"
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="truncate pl-[3.75rem] text-[11px] text-os-muted">
        {playbookBlockTypeLabel(block.type)}
        {assigneeLabel && <> • {assigneeLabel}</>}
        {block.dueOffsetValue != null && (
          <>
            {" "}
            • {block.dueOffsetValue} {durationUnitLabel(block.dueOffsetUnit)}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-[3.75rem] text-[10px] font-bold">
        <span className={PRIORITY_DOT[block.priority] ?? "text-os-muted"}>{playbookBlockPriorityLabel(block.priority)}</span>
        {block.isRequired && (
          <>
            <span className="text-os-border">|</span>
            <span className="text-os-muted">Obrigatória</span>
          </>
        )}
        {block.blocksStage && (
          <>
            <span className="text-os-border">|</span>
            <span className="flex items-center gap-1 text-os-muted">
              <Lock className="h-2.5 w-2.5" /> Bloqueia conclusão
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function PlaybookStageContent({
  stage,
  totalStages,
  selectedBlockId,
  assigneeOptions,
  onSelectBlock,
  onAddBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onReorderBlocks,
}: {
  stage: PlaybookStageRow | null;
  totalStages: number;
  selectedBlockId: string | null;
  assigneeOptions: SimpleOption[];
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (orderedIds: string[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (!stage) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-os-border bg-os-card/40 p-10 text-center text-sm text-os-muted">
        Selecione uma etapa para ver seu conteúdo.
      </div>
    );
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId || !stage) {
      setDraggingId(null);
      return;
    }
    const ids = stage.blocks.map((b) => b.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorderBlocks(ids);
  }

  function assigneeLabel(block: PlaybookBlockRow): string | null {
    if (block.assigneeType === "usuario_especifico") {
      return block.defaultAssigneeId ? assigneeOptions.find((a) => a.id === block.defaultAssigneeId)?.name ?? null : null;
    }
    if (block.assigneeType === "papel_padrao") {
      return block.defaultAssigneeRole ? playbookAssigneeRoleLabel(block.defaultAssigneeRole) : null;
    }
    return "A definir ao aplicar";
  }

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-os-muted">
            Etapa {stage.position + 1} de {totalStages}
          </p>
          <h2 className="text-lg font-black text-os-ink">{stage.name || "Sem nome"}</h2>
          {stage.objective && <p className="mt-1 text-sm text-os-muted">{stage.objective}</p>}
        </div>
        {stage.durationValue != null && (
          <span className="shrink-0 rounded-full border border-os-border px-2.5 py-1 text-[11px] font-bold text-os-muted">
            {stage.durationValue} {durationUnitLabel(stage.durationUnit)}
          </span>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-os-ink">Blocos da Etapa</h3>
        <button
          onClick={onAddBlock}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar bloco
        </button>
      </div>

      {stage.blocks.length === 0 ? (
        <EmptyBlocksPlaceholder onAddInternalTask={onAddBlock} onAddClientRequest={onAddBlock} />
      ) : (
        <div className="flex flex-col gap-2">
          {stage.blocks.map((block, index) => (
            <BlockRow
              key={block.id}
              block={block}
              index={index}
              isSelected={block.id === selectedBlockId}
              assigneeLabel={assigneeLabel(block)}
              onSelect={() => onSelectBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
              dragProps={{
                draggable: true,
                onDragStart: () => setDraggingId(block.id),
                onDragOver: (e) => e.preventDefault(),
                onDrop: () => handleDrop(block.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
