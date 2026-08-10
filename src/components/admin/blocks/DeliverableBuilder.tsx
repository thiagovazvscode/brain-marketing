"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  File,
  FileQuestion,
  FileSpreadsheet,
  FileStack,
  FileText,
  FolderKanban,
  GripVertical,
  LayoutTemplate,
  Link2,
  Plus,
  Presentation,
  ClipboardList,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { PlaybookBlockRow, PlaybookDeliverableComponentRow, PlaybookDeliverableMaterialRow, PlaybookResourceOption, SimpleOption } from "@/types/methods";
import {
  DELIVERABLE_COMPONENT_FORMATS,
  DELIVERABLE_COMPONENT_TYPES,
  DELIVERABLE_MATERIAL_MOMENTS,
  DELIVERABLE_MATERIAL_ORIGINS,
  DELIVERABLE_MATERIAL_TYPES,
  PLAYBOOK_ASSIGNEE_ROLES,
  PLAYBOOK_BLOCK_ASSIGNEE_TYPES,
  deliverableComponentFormatLabel,
  deliverableComponentTypeLabel,
  deliverableMaterialMomentLabel,
  deliverableMaterialOriginLabel,
  deliverableMaterialTypeLabel,
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
  resourceOptions: PlaybookResourceOption[];
  assigneeOptions: SimpleOption[];
  materialError?: string | null;
  onCreateMaterial: (name: string, materialType: string, origin: string) => Promise<string | null>;
  onUpdateMaterial: (materialId: string, patch: Record<string, unknown>) => void;
  onDuplicateMaterial: (material: PlaybookDeliverableMaterialRow) => void;
  onDeleteMaterial: (materialId: string) => void;
  onReorderMaterials: (orderedIds: string[]) => void;
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

// Ícone por tipo de material (item 7 do pedido) — só ícones já usados no
// design system (lucide-react), nenhuma iconografia nova.
const MATERIAL_TYPE_ICON: Record<string, typeof FileText> = {
  document: FileText,
  file: File,
  link: Link2,
  template: LayoutTemplate,
  reference: BookOpen,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  briefing: ClipboardList,
  other: FileQuestion,
};

// Mesmo raciocínio de componentSummary — uma linha só, mesma densidade do
// card de componente (item 3 do pedido: "evitar excesso de informação no
// card fechado"). Momento só aparece quando resolvido (definir_ao_aplicar
// não agrega informação nova além do badge de obrigatoriedade).
function materialSummary(material: PlaybookDeliverableMaterialRow): string {
  const parts = [
    deliverableMaterialTypeLabel(material.materialType),
    deliverableMaterialOriginLabel(material.origin),
    material.isRequired ? "Obrigatório" : "Opcional",
  ];
  if (material.requiredMoment !== "define_on_apply") parts.push(deliverableMaterialMomentLabel(material.requiredMoment));
  if (!material.isActive) parts.push("Arquivado");
  return parts.join(" · ");
}

// Mesmo padrão de useComponentFieldFocus, escopado a focusHint.materialId.
function useMaterialFieldFocus(containerRef: React.RefObject<HTMLElement | null>, active: boolean, focusHint?: FocusHint | null) {
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

// Reconstrói a ordem completa dos materiais do bloco a partir de um drag
// feito só entre os itens VISÍVEIS (filtro "Ativos" pode esconder
// arquivados) — percorre a ordem original e substitui, na posição de cada
// item visível, o próximo id da nova ordem visível; itens ocultos mantêm a
// posição relativa original. Nunca perde/duplica um id.
function reconstructFullOrder(fullIds: string[], visibleIds: Set<string>, newVisibleOrder: string[]): string[] {
  let cursor = 0;
  return fullIds.map((id) => (visibleIds.has(id) ? newVisibleOrder[cursor++] : id));
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

// Modal de criação rápida de material (item 6 do pedido) — só nome/tipo/
// origem, mesmo raciocínio de NewComponentModal: o resto se configura
// depois, expandindo o material já criado (que abre automaticamente).
function NewMaterialModal({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (name: string, materialType: string, origin: string) => void }) {
  const [name, setName] = useState("");
  const [materialType, setMaterialType] = useState<string>(DELIVERABLE_MATERIAL_TYPES[0].id);
  const [origin, setOrigin] = useState<string>(DELIVERABLE_MATERIAL_ORIGINS[0].id);

  function submit() {
    if (!name.trim()) return;
    onSubmit(name.trim(), materialType, origin);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-os-border bg-os-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-base font-black text-os-ink">Novo material</h3>
        <p className="mt-0.5 text-xs text-os-muted">Defina o essencial agora — os demais campos ficam disponíveis depois de adicionado.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className={inputClass}>
              {DELIVERABLE_MATERIAL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Origem</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass}>
              {DELIVERABLE_MATERIAL_ORIGINS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
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
            disabled={!name.trim()}
            className="rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            Adicionar material
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

function MaterialRow({
  material,
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
  activeComponents,
  resourceOptions,
  assigneeOptions,
  autoFocusDescription,
}: {
  material: PlaybookDeliverableMaterialRow;
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
  activeComponents: PlaybookDeliverableComponentRow[];
  resourceOptions: PlaybookResourceOption[];
  assigneeOptions: SimpleOption[];
  autoFocusDescription?: boolean;
}) {
  const [name, setName] = useState(material.name);
  const [description, setDescription] = useState(material.description ?? "");
  const [url, setUrl] = useState(material.url ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const Icon = MATERIAL_TYPE_ICON[material.materialType] ?? FileQuestion;
  useMaterialFieldFocus(containerRef, expanded && focusHint?.materialId === material.id, focusHint);

  // Material recém-criado pelo modal (item 6 do pedido: "foco no primeiro
  // campo complementar") — nome/tipo/origem já vêm preenchidos do modal, o
  // primeiro campo complementar é a descrição. Roda uma única vez, no
  // mount da linha (que só acontece quando o material aparece na lista).
  useEffect(() => {
    if (autoFocusDescription) descriptionRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkedResource = material.resourceId ? resourceOptions.find((r) => r.id === material.resourceId) : null;

  if (!expanded) {
    return (
      <div
        {...dragProps}
        className={`flex items-center gap-2 rounded-xl border p-3 transition-colors duration-150 ${
          isDropTarget ? "border-os-accent bg-os-accent-soft" : "border-os-border bg-os-card"
        } ${!material.isActive ? "opacity-60" : ""}`}
      >
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <span className="w-5 shrink-0 text-xs font-bold text-os-muted">{index + 1}.</span>
        <Icon className="h-4 w-4 shrink-0 text-os-muted" />
        <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-expanded={false}>
          <p className="truncate text-sm font-semibold text-os-ink">{material.name || "Material sem nome"}</p>
          <p className="truncate text-[11px] font-medium text-os-muted">{materialSummary(material)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <button onClick={onDuplicate} className="text-os-muted hover:text-os-ink" aria-label="Duplicar material">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={onRequestDelete} className="text-red-600/70 hover:text-red-700" aria-label="Excluir material">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="h-4 w-px shrink-0 bg-os-border" />
        <button onClick={onExpand} className="shrink-0 text-os-muted hover:text-os-ink" aria-label="Expandir material">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} {...dragProps} className="rounded-xl border border-os-accent/15 bg-os-card p-3">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-os-muted/50" />
        <div className="min-w-0 flex-1 space-y-4">
          {!material.isActive && (
            <p className="rounded-lg border border-dashed border-os-border bg-os-bg/40 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-os-muted">
              Arquivado
            </p>
          )}

          {/* INFORMAÇÕES */}
          <div className="space-y-2">
            <div data-field="material.name">
              <label className={labelClass}>Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name.trim() && name !== material.name && onUpdate({ name: name.trim() })}
                placeholder="Nome do material"
                className={`${inputClass} font-semibold`}
              />
            </div>
            <div data-field="material.description">
              <label className={labelClass}>Descrição</label>
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== (material.description ?? "") && onUpdate({ description: description.trim() || null })}
                placeholder="Descrição (opcional)"
                rows={3}
                className={`${inputClass} resize-none text-xs`}
              />
            </div>
          </div>

          {/* CLASSIFICAÇÃO */}
          <div className="grid grid-cols-2 gap-2">
            <div data-field="material.materialType">
              <label className={labelClass}>Tipo</label>
              <select value={material.materialType} onChange={(e) => onUpdate({ materialType: e.target.value })} className={inputClass}>
                {DELIVERABLE_MATERIAL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div data-field="material.origin">
              <label className={labelClass}>Origem</label>
              <select value={material.origin} onChange={(e) => onUpdate({ origin: e.target.value })} className={inputClass}>
                {DELIVERABLE_MATERIAL_ORIGINS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RESPONSABILIDADE */}
          <div data-field="material.assignee" className="space-y-2">
            <label className={labelClass}>Responsável por fornecer</label>
            <select value={material.assigneeType} onChange={(e) => onUpdate({ assigneeType: e.target.value })} className={inputClass}>
              {PLAYBOOK_BLOCK_ASSIGNEE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {material.assigneeType === "papel_padrao" && (
              <select value={material.assigneeRole ?? ""} onChange={(e) => onUpdate({ assigneeRole: e.target.value })} className={inputClass}>
                <option value="">Selecionar papel</option>
                {PLAYBOOK_ASSIGNEE_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
            {material.assigneeType === "usuario_especifico" && (
              <select value={material.assigneeId ?? ""} onChange={(e) => onUpdate({ assigneeId: e.target.value || null })} className={inputClass}>
                <option value="">Selecionar usuário</option>
                {assigneeOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            {material.assigneeType === "definir_ao_aplicar" && (
              <p className="rounded-lg border border-dashed border-os-border/80 bg-os-bg/60 px-2.5 py-2 text-[11px] font-medium leading-snug text-os-ink/70">
                O responsável por fornecer este material será definido apenas quando o playbook for aplicado a um cliente.
              </p>
            )}
          </div>

          {/* REGRAS */}
          <div className="space-y-2">
            <div className="max-w-[180px]">
              <Switch checked={material.isRequired} onChange={(v) => onUpdate({ isRequired: v })} label="Obrigatório" />
            </div>
            <div data-field="material.requiredMoment">
              <label className={labelClass}>Momento necessário</label>
              <select value={material.requiredMoment} onChange={(e) => onUpdate({ requiredMoment: e.target.value })} className={inputClass}>
                {DELIVERABLE_MATERIAL_MOMENTS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {material.requiredMoment === "before_component" && (
              <div data-field="material.beforeComponentId">
                <label className={labelClass}>Componente relacionado</label>
                {activeComponents.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-os-border bg-os-bg/40 px-2.5 py-2 text-[11px] leading-snug text-os-muted">
                    Este entregável ainda não tem componentes ativos para relacionar.
                  </p>
                ) : (
                  <select value={material.beforeComponentId ?? ""} onChange={(e) => onUpdate({ beforeComponentId: e.target.value || null })} className={inputClass}>
                    <option value="">Selecionar componente</option>
                    {activeComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || "Componente sem título"}
                      </option>
                    ))}
                  </select>
                )}
                {material.beforeComponentId && !activeComponents.some((c) => c.id === material.beforeComponentId) && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-600">Componente relacionado não está mais disponível.</p>
                )}
              </div>
            )}
          </div>

          {/* REFERÊNCIA */}
          <div className="space-y-2">
            <div data-field="material.url">
              <label className={labelClass}>URL ou referência</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => url !== (material.url ?? "") && onUpdate({ url: url.trim() || null })}
                placeholder="https://... ou uma referência em texto"
                className={inputClass}
              />
            </div>
            <div data-field="material.resourceId">
              <label className={labelClass}>Recurso da biblioteca</label>
              {linkedResource ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-os-border bg-os-bg/40 px-2.5 py-2">
                  <span className="truncate text-xs font-semibold text-os-ink">{linkedResource.title}</span>
                  <button onClick={() => onUpdate({ resourceId: null })} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-os-muted hover:text-red-600">
                    <X className="h-3 w-3" /> Remover vínculo
                  </button>
                </div>
              ) : resourceOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-os-border bg-os-bg/40 px-2.5 py-2 text-[11px] leading-snug text-os-muted">
                  Nenhum recurso disponível. Você pode continuar sem vínculo ou cadastrar um recurso na biblioteca.
                </p>
              ) : (
                <select value="" onChange={(e) => e.target.value && onUpdate({ resourceId: e.target.value })} className={inputClass}>
                  <option value="">Nenhum recurso vinculado</option>
                  {resourceOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-os-border pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onDuplicate} className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink">
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </button>
              <button
                onClick={() => onUpdate({ isActive: !material.isActive })}
                className="flex items-center gap-1 text-xs font-bold text-os-muted hover:text-os-ink"
              >
                {material.isActive ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                {material.isActive ? "Arquivar" : "Reativar"}
              </button>
              <button onClick={onRequestDelete} className="flex items-center gap-1 border-l border-os-border pl-3 text-xs font-bold text-red-600/70 hover:text-red-700">
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
  resourceOptions,
  assigneeOptions,
  materialError,
  onCreateMaterial,
  onUpdateMaterial,
  onDuplicateMaterial,
  onDeleteMaterial,
  onReorderMaterials,
  focusHint,
}: Props) {
  const [tab, setTab] = useState<TabId>("components");
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookDeliverableComponentRow | null>(null);
  const appliedFocusNonceRef = useRef<number | null>(null);

  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [draggingMaterialId, setDraggingMaterialId] = useState<string | null>(null);
  const [dragOverMaterialId, setDragOverMaterialId] = useState<string | null>(null);
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState<PlaybookDeliverableMaterialRow | null>(null);
  const [materialsFilter, setMaterialsFilter] = useState<"active" | "all">("active");
  const appliedMaterialFocusNonceRef = useRef<number | null>(null);
  const appliedOpenTabNonceRef = useRef<number | null>(null);
  const [autoFocusMaterialId, setAutoFocusMaterialId] = useState<string | null>(null);

  const components = block.deliverableComponents;
  const materials = block.materials;
  const activeComponents = components.filter((c) => c.isActive);

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

  // Mesmo raciocínio acima, escopado a materialId — não precisa trocar o
  // filtro pra "Todos" mesmo se o material estiver arquivado: visibleMaterials
  // (abaixo) já mantém o item expandido visível independente do filtro
  // (item 16 do pedido: "garantir que o item fique visível mesmo se
  // arquivado").
  useEffect(() => {
    if (
      focusHint?.materialId &&
      focusHint.nonce !== appliedMaterialFocusNonceRef.current &&
      materials.some((m) => m.id === focusHint.materialId)
    ) {
      appliedMaterialFocusNonceRef.current = focusHint.nonce ?? null;
      setExpandedMaterialId(focusHint.materialId);
      setTab("materials");
    }
  }, [focusHint?.materialId, focusHint?.nonce, materials]);

  // Resumo clicável do painel direito (item 17 do pedido) — só troca de
  // aba, sem focar/expandir item nenhum.
  useEffect(() => {
    if (focusHint?.openTab && !focusHint.materialId && !focusHint.componentId && focusHint.nonce !== appliedOpenTabNonceRef.current) {
      appliedOpenTabNonceRef.current = focusHint.nonce ?? null;
      setTab(focusHint.openTab);
    }
  }, [focusHint?.openTab, focusHint?.nonce, focusHint?.materialId, focusHint?.componentId]);

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

  const visibleMaterials = materialsFilter === "all" ? materials : materials.filter((m) => m.isActive || m.id === expandedMaterialId);
  const activeMaterials = materials.filter((m) => m.isActive);
  const requiredActiveMaterials = activeMaterials.filter((m) => m.isRequired);
  const clientActiveMaterials = activeMaterials.filter((m) => m.origin === "client");

  function handleMaterialDrop(targetId: string) {
    setDragOverMaterialId(null);
    if (!draggingMaterialId || draggingMaterialId === targetId) {
      setDraggingMaterialId(null);
      return;
    }
    const visibleIds = visibleMaterials.map((m) => m.id);
    const from = visibleIds.indexOf(draggingMaterialId);
    const to = visibleIds.indexOf(targetId);
    visibleIds.splice(from, 1);
    visibleIds.splice(to, 0, draggingMaterialId);
    setDraggingMaterialId(null);
    const fullOrder = reconstructFullOrder(
      materials.map((m) => m.id),
      new Set(visibleMaterials.map((m) => m.id)),
      visibleIds
    );
    onReorderMaterials(fullOrder);
  }

  async function handleCreateMaterial(name: string, materialType: string, origin: string) {
    setShowNewMaterial(false);
    const newId = await onCreateMaterial(name, materialType, origin);
    if (newId) {
      setAutoFocusMaterialId(newId);
      setExpandedMaterialId(newId);
      setTab("materials");
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-os-ink">Materiais e modelos</h3>
              <p className="text-xs text-os-muted">Defina os materiais, modelos e referências necessários para produzir este entregável.</p>
            </div>
            <div className="flex items-center gap-2">
              {expandedMaterialId && (
                <button onClick={() => setExpandedMaterialId(null)} className="text-xs font-bold text-os-muted hover:text-os-ink">
                  Recolher todos
                </button>
              )}
              <button
                onClick={() => setShowNewMaterial(true)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-os-border px-2.5 py-1 text-xs font-bold text-os-muted hover:border-os-accent hover:text-os-accent"
              >
                <Plus className="h-3.5 w-3.5" /> Novo material
              </button>
            </div>
          </div>

          {materials.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-os-muted">
                {activeMaterials.length} {activeMaterials.length === 1 ? "material" : "materiais"} · {requiredActiveMaterials.length} obrigatório{requiredActiveMaterials.length === 1 ? "" : "s"} ·{" "}
                {clientActiveMaterials.length} do cliente
              </p>
              <div className="flex items-center gap-1 rounded-lg border border-os-border p-0.5">
                {(["active", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMaterialsFilter(f)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                      materialsFilter === f ? "bg-os-accent-soft text-os-accent" : "text-os-muted hover:text-os-ink"
                    }`}
                  >
                    {f === "active" ? "Ativos" : "Todos"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {materialError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{materialError}</p>}

          {materials.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-900">
                <FileStack className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-bold text-os-ink">Nenhum material configurado</h3>
              <p className="max-w-md text-xs leading-relaxed text-os-muted">
                Adicione documentos, modelos, referências ou informações necessárias para produzir este entregável.
              </p>
              <button
                onClick={() => setShowNewMaterial(true)}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar primeiro material
              </button>
            </div>
          ) : visibleMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-os-border bg-os-bg/30 p-6 text-center text-xs text-os-muted">
              Nenhum material ativo no momento.{" "}
              <button onClick={() => setMaterialsFilter("all")} className="font-bold text-os-accent hover:underline">
                Ver todos
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleMaterials.map((material, index) => {
                const dragProps = {
                  draggable: true,
                  onDragStart: () => setDraggingMaterialId(material.id),
                  onDragEnter: () => draggingMaterialId && draggingMaterialId !== material.id && setDragOverMaterialId(material.id),
                  onDragOver: (e: React.DragEvent) => e.preventDefault(),
                  onDragEnd: () => {
                    setDraggingMaterialId(null);
                    setDragOverMaterialId(null);
                  },
                  onDrop: () => handleMaterialDrop(material.id),
                };
                return (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    index={index}
                    expanded={material.id === expandedMaterialId}
                    isDropTarget={dragOverMaterialId === material.id}
                    onExpand={() => setExpandedMaterialId(material.id)}
                    onCollapse={() => setExpandedMaterialId(null)}
                    onUpdate={(patch) => onUpdateMaterial(material.id, patch)}
                    onDuplicate={() => onDuplicateMaterial(material)}
                    onRequestDelete={() => setDeleteMaterialTarget(material)}
                    dragProps={dragProps}
                    focusHint={focusHint}
                    activeComponents={activeComponents}
                    resourceOptions={resourceOptions}
                    assigneeOptions={assigneeOptions}
                    autoFocusDescription={autoFocusMaterialId === material.id}
                  />
                );
              })}
            </div>
          )}

          {deleteMaterialTarget && (
            <ConfirmDialog
              title={`Excluir "${deleteMaterialTarget.name}"?`}
              description="A operação afeta somente o rascunho e não altera o bloco Entregável."
              onCancel={() => setDeleteMaterialTarget(null)}
              onConfirm={async () => {
                onDeleteMaterial(deleteMaterialTarget.id);
                setDeleteMaterialTarget(null);
              }}
            />
          )}

          {showNewMaterial && <NewMaterialModal onCancel={() => setShowNewMaterial(false)} onSubmit={handleCreateMaterial} />}
        </div>
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
