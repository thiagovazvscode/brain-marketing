"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import type { PlaybookChecklistItemRow } from "@/types/methods";
import { Switch } from "@/components/admin/Switch";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-2.5 py-1.5 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

interface Props {
  items: PlaybookChecklistItemRow[];
  onCreate: () => void;
  onUpdate: (itemId: string, patch: Partial<PlaybookChecklistItemRow>) => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (item: PlaybookChecklistItemRow) => void;
  onReorder: (orderedIds: string[]) => void;
}

// Resumo do estado recolhido — grupo · obrigatório/opcional · evidência ·
// observação · arquivado (só os que fazem sentido pro item aparecem).
function itemSummary(item: PlaybookChecklistItemRow): string {
  const parts: string[] = [];
  if (item.groupName) parts.push(item.groupName);
  parts.push(item.isRequired ? "Obrigatório" : "Opcional");
  if (item.requiresEvidence) parts.push("Evidência");
  if (item.allowsNotes) parts.push("Observação");
  if (!item.isActive) parts.push("Arquivado");
  return parts.join(" · ");
}

function CollapsedRow({
  item,
  index,
  onExpand,
  onDuplicate,
  onRequestDelete,
  dragProps,
}: {
  item: PlaybookChecklistItemRow;
  index: number;
  onExpand: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div {...dragProps} className="flex items-center gap-2 rounded-xl border border-os-border bg-os-card p-3">
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
      <span className="w-5 shrink-0 text-xs font-bold text-os-muted">{index + 1}.</span>
      <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-expanded={false}>
        <p className="truncate text-sm font-semibold text-os-ink">{item.title || "Item sem título"}</p>
        <p className="truncate text-[11px] text-os-muted">{itemSummary(item)}</p>
      </button>
      <button onClick={onDuplicate} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Duplicar item">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button onClick={onRequestDelete} className="shrink-0 text-os-muted hover:text-red-600" aria-label="Excluir item">
        <Trash2 className="h-4 w-4" />
      </button>
      <button onClick={onExpand} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Expandir item">
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function ExpandedRow({
  item,
  onUpdate,
  onCollapse,
  onDuplicate,
  onRequestDelete,
  dragProps,
}: {
  item: PlaybookChecklistItemRow;
  onUpdate: (patch: Partial<PlaybookChecklistItemRow>) => void;
  onCollapse: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [groupName, setGroupName] = useState(item.groupName ?? "");

  return (
    <div {...dragProps} className="rounded-xl border border-os-accent/40 bg-os-card p-3">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== item.title && onUpdate({ title: title.trim() })}
            placeholder="Texto do item"
            className={`${inputClass} font-semibold`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (item.description ?? "") && onUpdate({ description: description.trim() || null })}
            placeholder="Descrição de apoio (opcional)"
            rows={2}
            className={`${inputClass} resize-none text-xs`}
          />
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onBlur={() => groupName !== (item.groupName ?? "") && onUpdate({ groupName: groupName.trim() || null })}
            placeholder="Grupo (opcional) — ex: Documentos"
            className={`${inputClass} text-xs`}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Switch checked={item.isRequired} onChange={(v) => onUpdate({ isRequired: v })} label="Obrigatório" />
            <Switch checked={item.requiresEvidence} onChange={(v) => onUpdate({ requiresEvidence: v })} label="Exige evidência" />
            <Switch checked={item.allowsNotes} onChange={(v) => onUpdate({ allowsNotes: v })} label="Permite observação" />
            <Switch checked={item.isActive} onChange={(v) => onUpdate({ isActive: v })} label="Ativo" />
          </div>
          <div className="flex items-center justify-between border-t border-os-border pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onDuplicate} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </button>
              <button onClick={onRequestDelete} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
            <button onClick={onCollapse} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
              Recolher <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChecklistBuilder({ items, onCreate, onUpdate, onDelete, onDuplicate, onReorder }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookChecklistItemRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorder(ids);
  }

  function requestDelete(item: PlaybookChecklistItemRow) {
    // Confirma só quando o item já tem configuração relevante (regra do
    // pedido) — item vazio/recém-criado exclui direto.
    if (item.description || item.groupName || item.requiresEvidence) {
      setDeleteTarget(item);
    } else {
      onDelete(item.id);
    }
  }

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-os-ink">Itens do Checklist</h3>
        <div className="flex items-center gap-2">
          {expandedId && (
            <button onClick={() => setExpandedId(null)} className="text-xs font-bold text-os-muted hover:text-os-ink">
              Recolher todos
            </button>
          )}
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center text-sm text-os-muted">
          Este checklist ainda não tem itens. Adicione o primeiro item acima.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const dragProps = {
              draggable: true,
              onDragStart: () => setDraggingId(item.id),
              onDragOver: (e: React.DragEvent) => e.preventDefault(),
              onDrop: () => handleDrop(item.id),
            };
            return item.id === expandedId ? (
              <ExpandedRow
                key={item.id}
                item={item}
                onUpdate={(patch) => onUpdate(item.id, patch)}
                onCollapse={() => setExpandedId(null)}
                onDuplicate={() => onDuplicate(item)}
                onRequestDelete={() => requestDelete(item)}
                dragProps={dragProps}
              />
            ) : (
              <CollapsedRow
                key={item.id}
                item={item}
                index={index}
                onExpand={() => setExpandedId(item.id)}
                onDuplicate={() => onDuplicate(item)}
                onRequestDelete={() => requestDelete(item)}
                dragProps={dragProps}
              />
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-os-muted">0 de {items.length} concluídos — representação de como aparecerá na execução futura.</p>

      {deleteTarget && (
        <ConfirmDialog
          title={`Excluir "${deleteTarget.title}"?`}
          description="Este item já tem configuração preenchida. A operação afeta somente o rascunho."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
