"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Copy,
  FileStack,
  FolderKanban,
  GripVertical,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { PlaybookBlockRow, PlaybookDeliverableComponentRow } from "@/types/methods";
import {
  DELIVERABLE_COMPONENT_FORMATS,
  DELIVERABLE_COMPONENT_TYPES,
  PLAYBOOK_ASSIGNEE_ROLES,
  PLAYBOOK_BLOCK_ASSIGNEE_TYPES,
  deliverableComponentFormatLabel,
  deliverableComponentTypeLabel,
} from "@/lib/methods";
import { Switch } from "@/components/admin/Switch";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { FocusHint } from "@/components/admin/PlaybookConfigPanel";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-2.5 py-1.5 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-os-muted";

const TABS = [
  { id: "components", label: "Componentes" },
  { id: "materials", label: "Materiais e modelos" },
  { id: "production", label: "Produção e qualidade" },
  { id: "delivery", label: "Entrega" },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface Props {
  block: PlaybookBlockRow;
  componentError?: string | null;
  onCreateComponent: (title: string, componentType: string, expectedFormat: string) => void;
  onUpdateComponent: (componentId: string, patch: Record<string, unknown>) => void;
  onDuplicateComponent: (component: PlaybookDeliverableComponentRow) => void;
  onDeleteComponent: (componentId: string) => void;
  onReorderComponents: (orderedIds: string[]) => void;
  focusHint?: FocusHint | null;
}

// Mesmo padrão de useFieldFocus em PlaybookConfigPanel.tsx (rolar até
// `[data-field]` e aplicar destaque temporário de 2s) — aqui escopado ao
// componente certo (focusHint.componentId), pra um problema de "Descrição"
// não destacar o campo errado num componente diferente.
function useComponentFieldFocus(containerRef: React.RefObject<HTMLElement | null>, active: boolean, focusHint?: FocusHint | null) {
  useEffect(() => {
    if (!active || !focusHint?.field) return;
    const timer = setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-field="${focusHint.field}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-os-accent", "ring-offset-2", "rounded-lg");
      const clearTimer = setTimeout(() => el.classList.remove("ring-2", "ring-os-accent", "ring-offset-2"), 2000);
      return () => clearTimeout(clearTimer);
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, focusHint?.field, focusHint?.nonce]);
}

function componentSummary(component: PlaybookDeliverableComponentRow): string {
  const parts = [
    deliverableComponentTypeLabel(component.componentType),
    deliverableComponentFormatLabel(component.expectedFormat),
    component.isRequired ? "Obrigatório" : "Opcional",
  ];
  if (!component.isActive) parts.push("Arquivado");
  return parts.join(" · ");
}

// Modal de criação rápida (item 9/13 do pedido) — só o essencial (título,
// tipo, formato), mesmo raciocínio do NewBlockDialog: o resto se configura
// depois, expandindo o componente já criado. componentType/expectedFormat
// nunca ficam vazios no estado do formulário (sempre a 1ª opção da lista) —
// as duas colunas são NOT NULL sem DEFAULT no banco de propósito, então a
// API rejeitaria um POST sem os dois.
function NewComponentModal({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (title: string, componentType: string, expectedFormat: string) => void }) {
  const [title, setTitle] = useState("");
  const [componentType, setComponentType] = useState<string>(DELIVERABLE_COMPONENT_TYPES[0].id);
  const [expectedFormat, setExpectedFormat] = useState<string>(DELIVERABLE_COMPONENT_FORMATS[0].id);

  function submit() {
    if (!title.trim()) return;
    onSubmit(title.trim(), componentType, expectedFormat);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-base font-black text-os-ink">Novo componente</h3>
        <p className="mt-0.5 text-xs text-os-muted">Defina o essencial agora — os demais campos ficam disponíveis depois de adicionado.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClass}>Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={componentType} onChange={(e) => setComponentType(e.target.value)} className={inputClass}>
              {DELIVERABLE_COMPONENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Formato esperado</label>
            <select value={expectedFormat} onChange={(e) => setExpectedFormat(e.target.value)} className={inputClass}>
              {DELIVERABLE_COMPONENT_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            Adicionar componente
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponentRow({
  component,
  index,
  expanded,
  onExpand,
  onCollapse,
  onUpdate,
  onDuplicate,
  onRequestDelete,
  dragProps,
  isDropTarget,
  focusHint,
}: {
  component: PlaybookDeliverableComponentRow;
  index: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onUpdate: (patch: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  isDropTarget?: boolean;
  focusHint?: FocusHint | null;
}) {
  const [title, setTitle] = useState(component.title);
  const [description, setDescription] = useState(component.description ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(component.acceptanceCriteria ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  useComponentFieldFocus(containerRef, expanded && focusHint?.componentId === component.id, focusHint);

  if (!expanded) {
    return (
      <div
        {...dragProps}
        className={`flex items-center gap-2 rounded-xl border p-3 transition-colors duration-150 ${
          isDropTarget ? "border-os-accent bg-os-accent-soft" : "border-os-border bg-os-card"
        } ${!component.isActive ? "opacity-60" : ""}`}
      >
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <span className="w-5 shrink-0 text-xs font-bold text-os-muted">{index + 1}.</span>
        <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-expanded={false}>
          <p className="truncate text-sm font-semibold text-os-ink">{component.title || "Componente sem título"}</p>
          <p className="truncate text-[11px] text-os-muted">{componentSummary(component)}</p>
        </button>
        <button onClick={onDuplicate} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Duplicar componente">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button onClick={onRequestDelete} className="shrink-0 text-os-muted hover:text-red-600" aria-label="Excluir componente">
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={onExpand} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Expandir componente">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} {...dragProps} className="rounded-xl border border-os-accent/40 bg-os-card p-3">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <div className="min-w-0 flex-1 space-y-2">
          <div data-field="deliverable.component.title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== component.title && onUpdate({ title: title.trim() })}
              placeholder="Título do componente"
              className={`${inputClass} font-semibold`}
            />
          </div>
          <div data-field="deliverable.component.description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (component.description ?? "") && onUpdate({ description: description.trim() || null })}
              placeholder="Descrição (opcional)"
              rows={2}
              className={`${inputClass} resize-none text-xs`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div data-field="deliverable.component.type">
              <label className={labelClass}>Tipo</label>
              <select value={component.componentType} onChange={(e) => onUpdate({ componentType: e.target.value })} className={inputClass}>
                {DELIVERABLE_COMPONENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div data-field="deliverable.component.format">
              <label className={labelClass}>Formato esperado</label>
              <select value={component.expectedFormat} onChange={(e) => onUpdate({ expectedFormat: e.target.value })} className={inputClass}>
                {DELIVERABLE_COMPONENT_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div data-field="deliverable.component.assignee">
            <label className={labelClass}>Modalidade de responsável</label>
            <select value={component.defaultAssigneeType} onChange={(e) => onUpdate({ defaultAssigneeType: e.target.value })} className={inputClass}>
              {PLAYBOOK_BLOCK_ASSIGNEE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {component.defaultAssigneeType === "papel_padrao" && (
            <div>
              <label className={labelClass}>Papel padrão</label>
              <select value={component.defaultAssigneeRole ?? ""} onChange={(e) => onUpdate({ defaultAssigneeRole: e.target.value })} className={inputClass}>
                <option value="">Selecionar</option>
                {PLAYBOOK_ASSIGNEE_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {component.defaultAssigneeType === "definir_ao_aplicar" && (
            <p className="rounded-lg border border-dashed border-os-border bg-os-bg/40 px-2.5 py-2 text-[11px] leading-snug text-os-muted">
              O responsável deste componente será definido apenas quando o playbook for aplicado a um cliente.
            </p>
          )}

          <div data-field="deliverable.component.acceptanceCriteria">
            <label htmlFor={`acceptance-criteria-${component.id}`} className={labelClass}>
              Critério de aceite
            </label>
            <textarea
              id={`acceptance-criteria-${component.id}`}
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              onBlur={() => acceptanceCriteria !== (component.acceptanceCriteria ?? "") && onUpdate({ acceptanceCriteria: acceptanceCriteria.trim() || null })}
              placeholder="O que precisa estar pronto para este componente ser considerado concluído"
              rows={2}
              className={`${inputClass} resize-none text-xs`}
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Switch checked={component.isRequired} onChange={(v) => onUpdate({ isRequired: v })} label="Obrigatório" />
            <Switch checked={component.isActive} onChange={(v) => onUpdate({ isActive: v })} label="Ativo" />
          </div>

          <div className="flex items-center justify-between border-t border-os-border pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onDuplicate} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </button>
              <button onClick={onRequestDelete} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
              <button
                onClick={() => onUpdate({ isActive: !component.isActive })}
                className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink"
              >
                {component.isActive ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                {component.isActive ? "Arquivar" : "Reativar"}
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

function InfoPanel({ icon: Icon, title, description }: { icon: typeof FileStack; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-900">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-bold text-os-ink">{title}</h3>
      <p className="max-w-md text-xs leading-relaxed text-os-muted">{description}</p>
    </div>
  );
}

export function DeliverableBuilder({
  block,
  componentError,
  onCreateComponent,
  onUpdateComponent,
  onDuplicateComponent,
  onDeleteComponent,
  onReorderComponents,
  focusHint,
}: Props) {
  const [tab, setTab] = useState<TabId>("components");
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookDeliverableComponentRow | null>(null);
  const appliedFocusNonceRef = useRef<number | null>(null);

  const components = block.deliverableComponents;

  // Ao clicar num problema da Validação (componentId em foco), abre o
  // componente certo automaticamente — mesmo raciocínio do focusHint no
  // AnalysisBuilder. Guardado por nonce para aplicar só uma vez por clique de
  // navegação, sem sobrescrever expand/collapse manual do usuário depois.
  useEffect(() => {
    if (
      focusHint?.componentId &&
      focusHint.nonce !== appliedFocusNonceRef.current &&
      components.some((c) => c.id === focusHint.componentId)
    ) {
      appliedFocusNonceRef.current = focusHint.nonce ?? null;
      setExpandedId(focusHint.componentId);
      setTab("components");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusHint?.componentId, focusHint?.nonce]);

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids = components.map((c) => c.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    onReorderComponents(ids);
  }

  function requestDelete(component: PlaybookDeliverableComponentRow) {
    if (component.description || component.acceptanceCriteria) {
      setDeleteTarget(component);
    } else {
      onDeleteComponent(component.id);
    }
  }

  return (
    <div className="min-w-0 flex-1 space-y-3 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-os-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === t.id ? "bg-os-accent-soft text-os-accent" : "text-os-muted hover:bg-os-bg hover:text-os-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {componentError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{componentError}</p>}

      {tab === "components" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-os-ink">Componentes do Entregável</h3>
            <div className="flex items-center gap-2">
              {expandedId && (
                <button onClick={() => setExpandedId(null)} className="text-xs font-bold text-os-muted hover:text-os-ink">
                  Recolher todos os componentes
                </button>
              )}
              <button
                onClick={() => setShowNewComponent(true)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar componente
              </button>
            </div>
          </div>

          {components.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center text-sm text-os-muted">
              Este entregável ainda não tem componentes. Adicione o primeiro acima.
            </div>
          ) : (
            <div className="space-y-2">
              {components.map((component, index) => {
                const dragProps = {
                  draggable: true,
                  onDragStart: () => setDraggingId(component.id),
                  onDragEnter: () => draggingId && draggingId !== component.id && setDragOverId(component.id),
                  onDragOver: (e: React.DragEvent) => e.preventDefault(),
                  onDragEnd: () => {
                    setDraggingId(null);
                    setDragOverId(null);
                  },
                  onDrop: () => handleDrop(component.id),
                };
                return (
                  <ComponentRow
                    key={component.id}
                    component={component}
                    index={index}
                    expanded={component.id === expandedId}
                    isDropTarget={dragOverId === component.id}
                    onExpand={() => setExpandedId(component.id)}
                    onCollapse={() => setExpandedId(null)}
                    onUpdate={(patch) => onUpdateComponent(component.id, patch)}
                    onDuplicate={() => onDuplicateComponent(component)}
                    onRequestDelete={() => requestDelete(component)}
                    dragProps={dragProps}
                    focusHint={focusHint}
                  />
                );
              })}
            </div>
          )}

          {deleteTarget && (
            <ConfirmDialog
              title={`Excluir "${deleteTarget.title}"?`}
              description="A operação afeta somente o rascunho e não altera o bloco Entregável."
              onCancel={() => setDeleteTarget(null)}
              onConfirm={async () => {
                onDeleteComponent(deleteTarget.id);
                setDeleteTarget(null);
              }}
            />
          )}

          {showNewComponent && (
            <NewComponentModal
              onCancel={() => setShowNewComponent(false)}
              onSubmit={(title, componentType, expectedFormat) => {
                onCreateComponent(title, componentType, expectedFormat);
                setShowNewComponent(false);
              }}
            />
          )}
        </div>
      )}

      {tab === "materials" && (
        <InfoPanel
          icon={FileStack}
          title="Materiais e modelos"
          description="Esta área reunirá arquivos-base, modelos, referências e recursos necessários para produzir o entregável. A vinculação completa será implementada na próxima etapa."
        />
      )}

      {tab === "production" && (
        <InfoPanel
          icon={FolderKanban}
          title="Produção e qualidade"
          description="Esta área reunirá revisão, critérios de qualidade, responsáveis e controle de produção. A configuração de 'Exige revisão interna' já está disponível no painel de configuração do bloco, à direita."
        />
      )}

      {tab === "delivery" && (
        <InfoPanel
          icon={Send}
          title="Entrega"
          description="Esta área reunirá público, canal, formato final, apresentação e futura aprovação."
        />
      )}
    </div>
  );
}
