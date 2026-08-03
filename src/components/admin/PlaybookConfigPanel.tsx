"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, Trash2, Copy } from "lucide-react";
import type { PlaybookBlockRow, PlaybookResourceOption, PlaybookStageRow, SimpleOption } from "@/types/methods";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_FORMATS,
  DOCUMENT_KINDS,
  DOCUMENT_ORIGINS,
  DOCUMENT_VISIBILITY,
  DUE_OFFSET_ANCHORS,
  DURATION_UNITS,
  FORM_RESPONDENT_TYPES,
  MEETING_DURATION_UNITS,
  MEETING_FORMATS,
  MEETING_TYPES,
  OVERDUE_ACTIONS,
  PLAYBOOK_ASSIGNEE_ROLES,
  PLAYBOOK_BLOCK_ASSIGNEE_TYPES,
  PLAYBOOK_BLOCK_PRIORITIES,
  PLAYBOOK_EXTERNAL_CONTACT_ROLES,
  durationUnitLabel,
  meetingDurationUnitLabel,
  meetingFormatLabel,
  playbookAssigneeRoleLabel,
  playbookBlockPriorityLabel,
  playbookBlockTypeLabel,
} from "@/lib/methods";
import { Switch } from "@/components/admin/Switch";
import { ListFieldEditor } from "@/components/admin/blocks/ListFieldEditor";
import type { SaveState } from "@/components/admin/PlaybookEditor";
import { SAVE_META } from "@/components/admin/PlaybookEditorHeader";

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-os-muted";
const textareaBase =
  "w-full resize-y rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none";

/**
 * Autosave com debounce (800ms) — regra do pedido: nunca salvar a cada
 * tecla sem controle, sempre mostrar se está salvando/salvo/erro/pendente.
 * `key` reseta o estado ao trocar de seleção (etapa/bloco diferente).
 */
function useAutosave<T extends object>(
  key: string,
  initial: T,
  onSave: (patch: Partial<T>) => Promise<void>,
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void
) {
  const [draft, setDraft] = useState<T>(initial);
  const lastSavedRef = useRef<T>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(key);

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setDraft(initial);
      lastSavedRef.current = initial;
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function update<K extends keyof T>(field: K, value: T[K]) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onStatusChange("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const patch: Partial<T> = {};
      for (const k of Object.keys(next) as (keyof T)[]) {
        if (next[k] !== lastSavedRef.current[k]) patch[k] = next[k];
      }
      if (Object.keys(patch).length === 0) return;
      onStatusChange("saving");
      try {
        await onSave(patch);
        lastSavedRef.current = next;
        onStatusChange("saved");
      } catch {
        onStatusChange("error");
      }
    }, 800);
  }

  return { draft, update };
}

export interface FocusHint {
  field?: string;
  // Incrementado a cada clique num problema da Validação — permite focar o
  // mesmo campo duas vezes seguidas (ex.: usuário clica, edita errado, clica
  // de novo no mesmo problema).
  nonce: number;
}

/**
 * Rola até o campo marcado com `data-field="<field>"` dentro do container e
 * aplica um destaque temporário (2s) — usado ao clicar num problema da
 * Validação. Roda com um pequeno atraso pra dar tempo do CollapsibleFieldGroup
 * (se houver) abrir primeiro via seu próprio efeito.
 */
function useFieldFocus(containerRef: RefObject<HTMLElement | null>, focusHint: FocusHint | null | undefined) {
  useEffect(() => {
    if (!focusHint?.field) return;
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
  }, [focusHint?.field, focusHint?.nonce]);
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-os-border/70 pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-os-muted/80">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// Seção recolhível — usada nas 5 seções da Reunião pra evitar uma coluna
// lateral longa e sem hierarquia. Cada seção abre/fecha independente (não é
// accordion exclusivo); a primeira normalmente começa aberta, as demais
// mostram um resumo de uma linha quando fechadas.
function CollapsibleFieldGroup({
  title,
  summary,
  defaultOpen,
  forceOpen,
  focusNonce,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  // true quando o campo focado pela Validação (ver FocusHint) mora nesta
  // seção — força a abertura mesmo que o usuário a tenha fechado.
  forceOpen?: boolean;
  focusNonce?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  // Abrir a seção certa ao clicar num problema da Validação é "ajustar
  // estado a partir de props durante a renderização" (padrão recomendado
  // pelo React pra isto), não um efeito colateral — por isso roda no corpo
  // do componente, num `if`, e não dentro de useEffect.
  const [appliedNonce, setAppliedNonce] = useState<number | undefined>(undefined);
  if (forceOpen && focusNonce !== undefined && focusNonce !== appliedNonce) {
    setAppliedNonce(focusNonce);
    if (!open) setOpen(true);
  }
  return (
    <div className="border-t border-os-border/70 pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-os-muted/80">{title}</h4>
          {!open && <p className="mt-0.5 truncate text-xs text-os-muted">{summary || "Sem informações preenchidas."}</p>}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-os-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-os-muted" />
        )}
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function PanelSaveStatus({ status }: { status: SaveState }) {
  const meta = SAVE_META[status];
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-os-muted">
      {meta.icon} {meta.label}
    </p>
  );
}

function MoreActionsMenu({ onDuplicate, onDelete }: { onDuplicate?: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1.5 rounded-lg px-1 py-1.5 text-xs font-bold text-os-muted hover:text-os-ink"
      >
        <span className="flex items-center gap-1.5">
          <MoreHorizontal className="h-3.5 w-3.5" /> Mais ações
        </span>
      </button>
      {open && (
        <div className="mt-1 overflow-hidden rounded-lg border border-os-border bg-os-card shadow-sm">
          {onDuplicate && (
            <button
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-os-ink hover:bg-os-bg"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicar bloco
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 border-t border-os-border/70 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir bloco
          </button>
        </div>
      )}
    </div>
  );
}

interface StageDraftFields {
  name: string;
  objective: string;
  description: string;
  internalInstructions: string;
  durationValue: number | null;
  durationUnit: string;
  defaultAssigneeRole: string;
  isRequired: boolean;
  blocksNextStage: boolean;
  completionCriteria: string;
  expectedDeliverable: string;
  priority: string;
}

interface BlockDraftFields {
  title: string;
  description: string;
  internalInstructions: string;
  assigneeType: string;
  defaultAssigneeRole: string;
  defaultAssigneeId: string;
  externalResponsibleRole: string;
  dueOffsetValue: number | null;
  dueOffsetUnit: string;
  dueOffsetAnchor: string;
  priority: string;
  isRequired: boolean;
  blocksStage: boolean;
  dependencyBlockId: string;
  expectedResult: string;
  completionCriteria: string;
  overdueAction: string;
  clientExpectedResponse: string;
  metadata: Record<string, unknown>;
}

function StageConfigForm({
  stage,
  saveState,
  onSave,
  onStatusChange,
  focusHint,
}: {
  stage: PlaybookStageRow;
  saveState: SaveState;
  onSave: (patch: Partial<StageDraftFields>) => Promise<void>;
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void;
  focusHint?: FocusHint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFieldFocus(containerRef, focusHint);
  const { draft, update } = useAutosave<StageDraftFields>(stage.id, {
    name: stage.name,
    objective: stage.objective ?? "",
    description: stage.description ?? "",
    internalInstructions: stage.internalInstructions ?? "",
    durationValue: stage.durationValue,
    durationUnit: stage.durationUnit ?? "dias_uteis",
    defaultAssigneeRole: stage.defaultAssigneeRole ?? "",
    isRequired: stage.isRequired,
    blocksNextStage: stage.blocksNextStage,
    completionCriteria: stage.completionCriteria ?? "",
    expectedDeliverable: stage.expectedDeliverable ?? "",
    priority: stage.priority,
  }, onSave, onStatusChange);

  return (
    <div ref={containerRef} className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-os-ink">Configuração da Etapa</h3>
          <span className="rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-bold text-os-muted">
            ETAPA {stage.position + 1}
          </span>
        </div>
        <div className="mt-1">
          <PanelSaveStatus status={saveState} />
        </div>
      </div>

      <FieldGroup title="Identificação">
        <div data-field="name">
          <label className={labelClass}>Nome</label>
          <input value={draft.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
        </div>
        <div data-field="objective">
          <label className={labelClass}>Objetivo</label>
          <input value={draft.objective} onChange={(e) => update("objective", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            className={`${textareaBase} min-h-[96px]`}
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Responsabilidade e prazo">
        <div className="grid grid-cols-2 gap-2" data-field="durationValue">
          <div>
            <label className={labelClass}>Duração</label>
            <input
              type="number"
              min={0}
              value={draft.durationValue ?? ""}
              onChange={(e) => update("durationValue", e.target.value === "" ? null : Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Unidade</label>
            <select value={draft.durationUnit} onChange={(e) => update("durationUnit", e.target.value)} className={inputClass}>
              {DURATION_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Responsável padrão</label>
          <input value={draft.defaultAssigneeRole} onChange={(e) => update("defaultAssigneeRole", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prioridade</label>
          <select value={draft.priority} onChange={(e) => update("priority", e.target.value)} className={inputClass}>
            {PLAYBOOK_BLOCK_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </FieldGroup>

      <FieldGroup title="Regras de execução">
        <Switch checked={draft.isRequired} onChange={(v) => update("isRequired", v)} label="Etapa obrigatória" />
        <Switch checked={draft.blocksNextStage} onChange={(v) => update("blocksNextStage", v)} label="Bloqueia próxima etapa" />
      </FieldGroup>

      <FieldGroup title="Conclusão">
        <div>
          <label className={labelClass}>Entregável esperado</label>
          <input value={draft.expectedDeliverable} onChange={(e) => update("expectedDeliverable", e.target.value)} className={inputClass} />
        </div>
        <div data-field="completionCriteria">
          <label className={labelClass}>Critério de conclusão</label>
          <textarea
            value={draft.completionCriteria}
            onChange={(e) => update("completionCriteria", e.target.value)}
            className={`${textareaBase} min-h-[96px]`}
          />
        </div>
      </FieldGroup>
    </div>
  );
}

function BlockConfigForm({
  block,
  siblingBlocks,
  assigneeOptions,
  resourceOptions,
  saveState,
  onSave,
  onStatusChange,
  focusHint,
}: {
  block: PlaybookBlockRow;
  siblingBlocks: PlaybookBlockRow[];
  assigneeOptions: SimpleOption[];
  resourceOptions: PlaybookResourceOption[];
  saveState: SaveState;
  onSave: (patch: Partial<BlockDraftFields>) => Promise<void>;
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void;
  focusHint?: FocusHint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFieldFocus(containerRef, focusHint);
  const focusField = focusHint?.field;
  const inSection = (fields: string[]) => Boolean(focusField && fields.includes(focusField));
  const { draft, update } = useAutosave<BlockDraftFields>(block.id, {
    title: block.title,
    description: block.description ?? "",
    internalInstructions: block.internalInstructions ?? "",
    assigneeType: block.assigneeType ?? "definir_ao_aplicar",
    defaultAssigneeRole: block.defaultAssigneeRole ?? "",
    defaultAssigneeId: block.defaultAssigneeId ?? "",
    externalResponsibleRole: block.externalResponsibleRole ?? "",
    dueOffsetValue: block.dueOffsetValue,
    dueOffsetUnit: block.dueOffsetUnit ?? "dias_uteis",
    dueOffsetAnchor: block.dueOffsetAnchor ?? "apos_inicio_etapa",
    priority: block.priority,
    isRequired: block.isRequired,
    blocksStage: block.blocksStage,
    dependencyBlockId: block.dependencyBlockId ?? "",
    expectedResult: block.expectedResult ?? "",
    completionCriteria: block.completionCriteria ?? "",
    overdueAction: block.overdueAction ?? "alertar",
    clientExpectedResponse: block.clientExpectedResponse ?? "",
    metadata: block.metadata ?? {},
  }, onSave, onStatusChange);

  const isClientRequest = block.type === "client_request";
  const isMeeting = block.type === "meeting";
  const isDocument = block.type === "document";
  const isChecklist = block.type === "checklist";
  const isForm = block.type === "form_briefing";

  const meta = draft.metadata;
  function updateMeta<K extends string>(key: K, value: unknown) {
    update("metadata", { ...draft.metadata, [key]: value });
  }
  const blockCode = `BL-${String(block.position + 1).padStart(3, "0")}`;

  const typeField = (
    <div>
      <label className={labelClass}>Tipo</label>
      <p className="rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink">{playbookBlockTypeLabel(block.type)}</p>
    </div>
  );

  // Tarefa interna / Solicitação ao cliente / Checklist — mesma forma de
  // Identificação das duas primeiras (Fase 2.1), reaproveitada pro Checklist
  // (item/pergunta ficam na coluna central, não aqui).
  const identification = (
    <FieldGroup title="Identificação">
      {typeField}
      <div data-field="title">
        <label className={labelClass}>{isChecklist ? "Nome" : "Título"}</label>
        <input value={draft.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{isClientRequest ? "Descrição para o cliente" : "Descrição"}</label>
        <textarea
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          className={`${textareaBase} min-h-[96px]`}
        />
      </div>
      <div>
        <label className={labelClass}>Instrução interna</label>
        <textarea
          value={draft.internalInstructions}
          onChange={(e) => update("internalInstructions", e.target.value)}
          className={`${textareaBase} min-h-[96px]`}
        />
      </div>
    </FieldGroup>
  );

  const meetingIdentificationSummary = [
    draft.title || "Sem título",
    meetingFormatLabel((meta.format as string) ?? "online"),
    (meta.durationValue as number | null) != null
      ? `${meta.durationValue} ${meetingDurationUnitLabel((meta.durationUnit as string) ?? "minutos")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const meetingIdentificationFields = ["title", "meeting.objective", "meeting.durationValue", "meeting.format"];
  const meetingIdentification = (
    <CollapsibleFieldGroup
      title="Identificação"
      summary={meetingIdentificationSummary}
      defaultOpen
      forceOpen={inSection(meetingIdentificationFields)}
      focusNonce={focusHint?.nonce}
    >
      {typeField}
      <div data-field="title">
        <label className={labelClass}>Título da reunião</label>
        <input value={draft.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
      </div>
      <div data-field="meeting.objective">
        <label className={labelClass}>Objetivo</label>
        <input value={(meta.objective as string) ?? ""} onChange={(e) => updateMeta("objective", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Descrição</label>
        <textarea value={draft.description} onChange={(e) => update("description", e.target.value)} className={`${textareaBase} min-h-[80px]`} />
      </div>
      <div>
        <label className={labelClass}>Tipo de reunião</label>
        <select value={(meta.meetingType as string) ?? "imersao"} onChange={(e) => updateMeta("meetingType", e.target.value)} className={inputClass}>
          {MEETING_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2" data-field="meeting.durationValue">
        <div>
          <label className={labelClass}>Duração estimada</label>
          <input
            type="number"
            min={0}
            value={(meta.durationValue as number | null) ?? ""}
            onChange={(e) => updateMeta("durationValue", e.target.value === "" ? null : Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Unidade</label>
          <select value={(meta.durationUnit as string) ?? "minutos"} onChange={(e) => updateMeta("durationUnit", e.target.value)} className={inputClass}>
            {MEETING_DURATION_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div data-field="meeting.format">
        <label className={labelClass}>Formato</label>
        <select value={(meta.format as string) ?? "online"} onChange={(e) => updateMeta("format", e.target.value)} className={inputClass}>
          {MEETING_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </CollapsibleFieldGroup>
  );

  const documentGeneral = (
    <FieldGroup title="Geral">
      {typeField}
      <div data-field="title">
        <label className={labelClass}>Nome do documento</label>
        <input value={draft.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
      </div>
      <div data-field="description">
        <label className={labelClass}>Descrição</label>
        <textarea value={draft.description} onChange={(e) => update("description", e.target.value)} className={`${textareaBase} min-h-[80px]`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div data-field="document.documentKind">
          <label className={labelClass}>Tipo de documento</label>
          <select value={(meta.documentKind as string) ?? "necessario"} onChange={(e) => updateMeta("documentKind", e.target.value)} className={inputClass}>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div data-field="document.origin">
          <label className={labelClass}>Origem</label>
          <select value={(meta.origin as string) ?? "brain"} onChange={(e) => updateMeta("origin", e.target.value)} className={inputClass}>
            {DOCUMENT_ORIGINS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div data-field="document.category">
        <label className={labelClass}>Categoria</label>
        <select value={(meta.category as string) ?? ""} onChange={(e) => updateMeta("category", e.target.value)} className={inputClass}>
          <option value="">Selecionar</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </FieldGroup>
  );

  const formIdentification = (
    <FieldGroup title="Identificação">
      {typeField}
      <div data-field="title">
        <label className={labelClass}>Nome do formulário</label>
        <input value={draft.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Introdução</label>
        <textarea
          value={(meta.introduction as string) ?? ""}
          onChange={(e) => updateMeta("introduction", e.target.value)}
          className={`${textareaBase} min-h-[80px]`}
          placeholder="Texto que o respondente vê antes de começar."
        />
      </div>
      <div>
        <label className={labelClass}>Instruções ao respondente</label>
        <textarea
          value={(meta.respondentInstructions as string) ?? ""}
          onChange={(e) => updateMeta("respondentInstructions", e.target.value)}
          className={`${textareaBase} min-h-[80px]`}
        />
      </div>
      <div>
        <label className={labelClass}>Instrução interna</label>
        <textarea
          value={draft.internalInstructions}
          onChange={(e) => update("internalInstructions", e.target.value)}
          className={`${textareaBase} min-h-[80px]`}
        />
      </div>
    </FieldGroup>
  );

  // Responsável interno tem 3 modalidades — playbook é modelo reaplicável,
  // então travar num admin_user específico não faz sentido como padrão.
  // "Preservar o usuário atualmente selecionado": trocar a modalidade não
  // limpa os outros dois campos, só troca qual deles conta pra validação.
  const internalAssigneeField = (
    <div data-field="assignee">
      <div>
        <label className={labelClass}>Responsável interno</label>
        <select value={draft.assigneeType} onChange={(e) => update("assigneeType", e.target.value)} className={inputClass}>
          {PLAYBOOK_BLOCK_ASSIGNEE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {draft.assigneeType === "papel_padrao" && (
        <div>
          <label className={labelClass}>Papel</label>
          <select value={draft.defaultAssigneeRole} onChange={(e) => update("defaultAssigneeRole", e.target.value)} className={inputClass}>
            <option value="">Selecionar</option>
            {PLAYBOOK_ASSIGNEE_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {draft.assigneeType === "usuario_especifico" && (
        <div>
          <label className={labelClass}>Usuário</label>
          <select value={draft.defaultAssigneeId} onChange={(e) => update("defaultAssigneeId", e.target.value)} className={inputClass}>
            <option value="">Selecionar</option>
            {assigneeOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {draft.assigneeType === "definir_ao_aplicar" && (
        <p className="rounded-lg border border-dashed border-os-border bg-os-bg/40 px-3 py-2 text-[11px] leading-snug text-os-muted">
          O responsável será definido apenas quando este playbook for aplicado a um cliente.
        </p>
      )}
    </div>
  );

  const dueAndPriority = (
    <>
      <div className="grid grid-cols-2 gap-2" data-field="dueOffsetValue">
        <div>
          <label className={labelClass}>Prazo relativo</label>
          <input
            type="number"
            min={0}
            value={draft.dueOffsetValue ?? ""}
            onChange={(e) => update("dueOffsetValue", e.target.value === "" ? null : Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Unidade</label>
          <select value={draft.dueOffsetUnit} onChange={(e) => update("dueOffsetUnit", e.target.value)} className={inputClass}>
            {DURATION_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Referência do prazo</label>
        <select value={draft.dueOffsetAnchor} onChange={(e) => update("dueOffsetAnchor", e.target.value)} className={inputClass}>
          {DUE_OFFSET_ANCHORS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Prioridade</label>
        <select value={draft.priority} onChange={(e) => update("priority", e.target.value)} className={inputClass}>
          {PLAYBOOK_BLOCK_PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const rules = (
    <>
      <Switch checked={draft.isRequired} onChange={(v) => update("isRequired", v)} label="Obrigatória" />
      <Switch
        checked={draft.blocksStage}
        onChange={(v) => update("blocksStage", v)}
        label="Bloqueia a conclusão da etapa"
        helpText="Enquanto este bloco estiver pendente, a etapa não poderá ser concluída."
      />
      <div>
        <label className={labelClass}>Dependência</label>
        <select value={draft.dependencyBlockId} onChange={(e) => update("dependencyBlockId", e.target.value)} className={inputClass}>
          <option value="">Selecionar (opcional)</option>
          {siblingBlocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const overdueHelp =
    draft.overdueAction === "criar_tarefa_followup"
      ? "Será criada uma tarefa de acompanhamento da pendência."
      : draft.overdueAction === "notificar_responsavel"
        ? "O responsável pelo bloco será notificado do atraso."
        : draft.overdueAction === "marcar_em_risco"
          ? "A etapa passa a aparecer como em risco até o bloco ser resolvido."
          : null;

  const overdueField = (
    <div>
      <label className={labelClass}>Ação em caso de atraso</label>
      <select value={draft.overdueAction} onChange={(e) => update("overdueAction", e.target.value)} className={inputClass}>
        {OVERDUE_ACTIONS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
      {overdueHelp && <p className="mt-1 text-[11px] leading-snug text-os-muted">{overdueHelp}</p>}
    </div>
  );

  // ── Reunião ──────────────────────────────────────────────────────────
  const meetingResponsibleSummary =
    draft.assigneeType === "papel_padrao" && draft.defaultAssigneeRole
      ? playbookAssigneeRoleLabel(draft.defaultAssigneeRole)
      : draft.assigneeType === "usuario_especifico" && draft.defaultAssigneeId
        ? (assigneeOptions.find((a) => a.id === draft.defaultAssigneeId)?.name ?? "Usuário selecionado")
        : "Responsável a definir";
  const meetingClientParticipantsCount = (meta.clientParticipants as string[] | undefined)?.length ?? 0;
  const meetingParticipantsSummary = [
    meetingResponsibleSummary,
    meetingClientParticipantsCount > 0 ? `Cliente: ${meetingClientParticipantsCount} participante(s)` : "Cliente a definir",
  ].join(" · ");

  const meetingParticipantsFields = ["assignee", "meeting.clientParticipants"];
  const meetingParticipants = (
    <CollapsibleFieldGroup
      title="Participantes"
      summary={meetingParticipantsSummary}
      forceOpen={inSection(meetingParticipantsFields)}
      focusNonce={focusHint?.nonce}
    >
      {internalAssigneeField}
      <div>
        <label className={labelClass}>Participantes internos por papel</label>
        <ListFieldEditor
          values={(meta.internalParticipantRoles as string[]) ?? []}
          onChange={(v) => updateMeta("internalParticipantRoles", v)}
          placeholder="Ex: Gestor de tráfego"
        />
      </div>
      <div data-field="meeting.clientParticipants">
        <label className={labelClass}>Participantes esperados do cliente</label>
        <ListFieldEditor
          values={(meta.clientParticipants as string[]) ?? []}
          onChange={(v) => updateMeta("clientParticipants", v)}
          placeholder="Ex: Sócio"
        />
      </div>
      <Switch
        checked={Boolean(meta.participantsRequired)}
        onChange={(v) => updateMeta("participantsRequired", v)}
        label="Presença obrigatória dos participantes"
      />
      <div>
        <label className={labelClass}>Papel do contato principal</label>
        <select value={(meta.mainContactRole as string) ?? ""} onChange={(e) => updateMeta("mainContactRole", e.target.value)} className={inputClass}>
          <option value="">Selecionar</option>
          {PLAYBOOK_EXTERNAL_CONTACT_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
    </CollapsibleFieldGroup>
  );

  const meetingAgendaCount = (meta.agenda as string[] | undefined)?.length ?? 0;
  const meetingKeyQuestionsCount = (meta.keyQuestions as string[] | undefined)?.length ?? 0;
  const meetingPreparationSummary =
    [
      meetingAgendaCount > 0 ? `${meetingAgendaCount} ${meetingAgendaCount === 1 ? "item" : "itens"} de pauta` : null,
      meetingKeyQuestionsCount > 0 ? `${meetingKeyQuestionsCount} ${meetingKeyQuestionsCount === 1 ? "pergunta" : "perguntas"}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Sem pauta definida";

  const meetingPreparationFields = ["meeting.prerequisites", "meeting.agenda"];
  const meetingPreparation = (
    <CollapsibleFieldGroup
      title="Preparação"
      summary={meetingPreparationSummary}
      forceOpen={inSection(meetingPreparationFields)}
      focusNonce={focusHint?.nonce}
    >
      <div data-field="meeting.prerequisites">
        <label className={labelClass}>Pré-requisitos</label>
        <ListFieldEditor values={(meta.prerequisites as string[]) ?? []} onChange={(v) => updateMeta("prerequisites", v)} placeholder="Adicionar pré-requisito" />
      </div>
      <div>
        <label className={labelClass}>Documentos necessários</label>
        <ListFieldEditor values={(meta.requiredDocuments as string[]) ?? []} onChange={(v) => updateMeta("requiredDocuments", v)} placeholder="Adicionar documento" />
      </div>
      <div data-field="meeting.agenda">
        <label className={labelClass}>Pauta da reunião</label>
        <ListFieldEditor values={(meta.agenda as string[]) ?? []} onChange={(v) => updateMeta("agenda", v)} placeholder="Adicionar item de pauta" />
      </div>
      <div>
        <label className={labelClass}>Perguntas-chave</label>
        <ListFieldEditor values={(meta.keyQuestions as string[]) ?? []} onChange={(v) => updateMeta("keyQuestions", v)} placeholder="Adicionar pergunta-chave" />
      </div>
      <div>
        <label className={labelClass}>Materiais a enviar antes da reunião</label>
        <ListFieldEditor values={(meta.materialsToSend as string[]) ?? []} onChange={(v) => updateMeta("materialsToSend", v)} placeholder="Adicionar material" />
      </div>
    </CollapsibleFieldGroup>
  );

  const meetingResultSummary = [
    meta.requiresMinutes ? "Ata obrigatória" : "Ata opcional",
    meta.associatedDeliverable ? "1 entregável" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const meetingResultFields = ["meeting.expectedResult", "meeting.completionCriteria"];
  const meetingResult = (
    <CollapsibleFieldGroup
      title="Resultado"
      summary={meetingResultSummary}
      forceOpen={inSection(meetingResultFields)}
      focusNonce={focusHint?.nonce}
    >
      <div data-field="meeting.expectedResult">
        <label className={labelClass}>Resultado esperado</label>
        <textarea value={draft.expectedResult} onChange={(e) => update("expectedResult", e.target.value)} className={`${textareaBase} min-h-[80px]`} />
      </div>
      <Switch checked={Boolean(meta.recordRequired)} onChange={(v) => updateMeta("recordRequired", v)} label="Registro obrigatório" />
      <Switch checked={Boolean(meta.requiresMinutes)} onChange={(v) => updateMeta("requiresMinutes", v)} label="Exige ata" />
      <div>
        <label className={labelClass}>Decisão esperada</label>
        <input value={(meta.expectedDecision as string) ?? ""} onChange={(e) => updateMeta("expectedDecision", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Entregável associado</label>
        <input value={(meta.associatedDeliverable as string) ?? ""} onChange={(e) => updateMeta("associatedDeliverable", e.target.value)} className={inputClass} />
      </div>
      <div data-field="meeting.completionCriteria">
        <label className={labelClass}>Critério de conclusão</label>
        <textarea value={draft.completionCriteria} onChange={(e) => update("completionCriteria", e.target.value)} className={`${textareaBase} min-h-[80px]`} />
      </div>
      <div>
        <label className={labelClass}>Observações</label>
        <textarea value={(meta.notes as string) ?? ""} onChange={(e) => updateMeta("notes", e.target.value)} className={`${textareaBase} min-h-[80px]`} />
      </div>
    </CollapsibleFieldGroup>
  );

  const meetingDeadlineSummary = [
    draft.dueOffsetValue != null ? `+${draft.dueOffsetValue} ${durationUnitLabel(draft.dueOffsetUnit)}` : "Sem prazo definido",
    `Prioridade ${playbookBlockPriorityLabel(draft.priority)}`,
  ].join(" · ");

  const meetingDeadline = (
    <CollapsibleFieldGroup
      title="Prazo e conclusão"
      summary={meetingDeadlineSummary}
      forceOpen={inSection(["dueOffsetValue"])}
      focusNonce={focusHint?.nonce}
    >
      {dueAndPriority}
      <div>
        <label className={labelClass}>Tolerância de reagendamento</label>
        <input
          value={(meta.rescheduleTolerance as string) ?? ""}
          onChange={(e) => updateMeta("rescheduleTolerance", e.target.value)}
          placeholder="Ex: até 2 dias úteis antes"
          className={inputClass}
        />
      </div>
      {rules}
      {overdueField}
    </CollapsibleFieldGroup>
  );

  // ── Documento ────────────────────────────────────────────────────────
  const documentFileAndResource = (
    <FieldGroup title="Arquivo e recurso">
      <div>
        <label className={labelClass}>Arquivo modelo</label>
        <input
          value={(meta.templateFileNote as string) ?? ""}
          onChange={(e) => updateMeta("templateFileNote", e.target.value)}
          placeholder="Nome ou nota sobre o modelo, se houver"
          className={inputClass}
        />
      </div>
      <div data-field="document.resourceId">
        <label className={labelClass}>Recurso vinculado</label>
        {resourceOptions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-os-border bg-os-bg/40 px-3 py-2 text-[11px] leading-snug text-os-muted">
            Nenhum recurso disponível. Você pode continuar sem vínculo ou cadastrar um recurso na biblioteca.
          </p>
        ) : (
          <select value={(meta.resourceId as string) ?? ""} onChange={(e) => updateMeta("resourceId", e.target.value || null)} className={inputClass}>
            <option value="">Sem vínculo</option>
            {resourceOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        )}
      </div>
    </FieldGroup>
  );

  const documentFormatsAndValidation = (
    <FieldGroup title="Formatos e validações">
      <div data-field="document.acceptedFormats">
        <label className={labelClass}>Formatos aceitos</label>
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENT_FORMATS.map((f) => {
            const selected = ((meta.acceptedFormats as string[]) ?? []).includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  const current = (meta.acceptedFormats as string[]) ?? [];
                  updateMeta("acceptedFormats", selected ? current.filter((x) => x !== f.id) : [...current, f.id]);
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  selected ? "border-os-accent bg-os-accent-soft text-os-accent" : "border-os-border text-os-muted hover:border-os-accent"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
      <Switch checked={Boolean(meta.requiresApproval)} onChange={(v) => updateMeta("requiresApproval", v)} label="Exige aprovação" />
      <div>
        <label className={labelClass}>Visibilidade</label>
        <select value={(meta.visibility as string) ?? ""} onChange={(e) => updateMeta("visibility", e.target.value)} className={inputClass}>
          <option value="">Selecionar</option>
          {DOCUMENT_VISIBILITY.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      {internalAssigneeField}
    </FieldGroup>
  );

  const documentDeadline = (
    <FieldGroup title="Prazo e conclusão">
      {dueAndPriority}
      {rules}
      <div data-field="completionCriteria">
        <label className={labelClass}>Critério de conclusão</label>
        <textarea value={draft.completionCriteria} onChange={(e) => update("completionCriteria", e.target.value)} className={`${textareaBase} min-h-[80px]`} />
      </div>
      {overdueField}
    </FieldGroup>
  );

  // ── Formulário / Briefing ────────────────────────────────────────────
  const formRespondents = (
    <FieldGroup title="Respondentes">
      {internalAssigneeField}
      <div data-field="form.respondentType">
        <label className={labelClass}>Quem deverá responder</label>
        <select value={(meta.respondentType as string) ?? "cliente"} onChange={(e) => updateMeta("respondentType", e.target.value)} className={inputClass}>
          {FORM_RESPONDENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {(meta.respondentType ?? "cliente") === "cliente" && (
        <div>
          <label className={labelClass}>Papel do respondente</label>
          <select value={(meta.respondentRole as string) ?? ""} onChange={(e) => updateMeta("respondentRole", e.target.value)} className={inputClass}>
            <option value="">Selecionar</option>
            {PLAYBOOK_EXTERNAL_CONTACT_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </FieldGroup>
  );

  return (
    <div ref={containerRef} className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-os-ink">Configuração do Bloco</h3>
          <span className="rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-bold text-os-muted">#{blockCode}</span>
        </div>
        <div className="mt-1">
          <PanelSaveStatus status={saveState} />
        </div>
      </div>

      {isMeeting && (
        <>
          {meetingIdentification}
          {meetingParticipants}
          {meetingPreparation}
          {meetingResult}
          {meetingDeadline}
        </>
      )}

      {isDocument && (
        <>
          {documentGeneral}
          {documentFileAndResource}
          {documentFormatsAndValidation}
          {documentDeadline}
        </>
      )}

      {isForm && (
        <>
          {formIdentification}
          {formRespondents}
          <FieldGroup title="Prazo e prioridade">{dueAndPriority}</FieldGroup>
          <FieldGroup title="Regras">{rules}</FieldGroup>
          <FieldGroup title="Conclusão">
            <div data-field="completionCriteria">
              <label className={labelClass}>Critério de conclusão</label>
              <textarea value={draft.completionCriteria} onChange={(e) => update("completionCriteria", e.target.value)} className={`${textareaBase} min-h-[96px]`} />
            </div>
            {overdueField}
          </FieldGroup>
        </>
      )}

      {isChecklist && (
        <>
          {identification}
          <FieldGroup title="Responsabilidade e prazo">
            {internalAssigneeField}
            {dueAndPriority}
          </FieldGroup>
          <FieldGroup title="Regras de execução">{rules}</FieldGroup>
          <FieldGroup title="Conclusão e risco">
            <div data-field="completionCriteria">
              <label className={labelClass}>Critério de conclusão</label>
              <textarea value={draft.completionCriteria} onChange={(e) => update("completionCriteria", e.target.value)} className={`${textareaBase} min-h-[96px]`} />
            </div>
            {overdueField}
          </FieldGroup>
        </>
      )}

      {isClientRequest && (
        <>
          {identification}
          <FieldGroup title="Responsáveis">
            {internalAssigneeField}
            <div>
              <label className={labelClass}>Responsável externo / papel do contato</label>
              <input
                value={draft.externalResponsibleRole}
                onChange={(e) => update("externalResponsibleRole", e.target.value)}
                placeholder="Ex: Gestor comercial do cliente"
                className={inputClass}
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Prazo e prioridade">{dueAndPriority}</FieldGroup>

          <FieldGroup title="Entrega e conclusão">
            <div>
              <label className={labelClass}>Documento ou resposta esperada</label>
              <textarea
                value={draft.clientExpectedResponse}
                onChange={(e) => update("clientExpectedResponse", e.target.value)}
                className={`${textareaBase} min-h-[80px]`}
              />
            </div>
            <div>
              <label className={labelClass}>Critério de conclusão</label>
              <textarea
                value={draft.completionCriteria}
                onChange={(e) => update("completionCriteria", e.target.value)}
                className={`${textareaBase} min-h-[96px]`}
              />
            </div>
            {overdueField}
          </FieldGroup>

          <FieldGroup title="Regras">{rules}</FieldGroup>
        </>
      )}

      {block.type === "internal_task" && (
        <>
          {identification}
          <FieldGroup title="Responsabilidade e prazo">
            {internalAssigneeField}
            {dueAndPriority}
          </FieldGroup>

          <FieldGroup title="Regras de execução">{rules}</FieldGroup>

          <FieldGroup title="Conclusão e risco">
            <div>
              <label className={labelClass}>Critério de conclusão</label>
              <textarea
                value={draft.completionCriteria}
                onChange={(e) => update("completionCriteria", e.target.value)}
                className={`${textareaBase} min-h-[96px]`}
              />
            </div>
            {overdueField}
          </FieldGroup>
        </>
      )}
    </div>
  );
}

export function PlaybookConfigPanel({
  stage,
  block,
  assigneeOptions,
  resourceOptions,
  saveState,
  onSaveStage,
  onSaveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onStatusChange,
  focusHint,
}: {
  stage: PlaybookStageRow | null;
  block: PlaybookBlockRow | null;
  assigneeOptions: SimpleOption[];
  resourceOptions: PlaybookResourceOption[];
  saveState: SaveState;
  onSaveStage: (stageId: string, patch: Partial<StageDraftFields>) => Promise<void>;
  onSaveBlock: (stageId: string, blockId: string, patch: Partial<BlockDraftFields>) => Promise<void>;
  onDuplicateBlock: (stageId: string, blockId: string) => void;
  onDeleteBlock: (stageId: string, blockId: string) => void;
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void;
  focusHint?: FocusHint | null;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-os-border bg-os-card">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {block && stage ? (
          <BlockConfigForm
            key={block.id}
            block={block}
            siblingBlocks={stage.blocks.filter((b) => b.id !== block.id)}
            assigneeOptions={assigneeOptions}
            resourceOptions={resourceOptions}
            saveState={saveState}
            onSave={(patch) => onSaveBlock(stage.id, block.id, patch)}
            onStatusChange={onStatusChange}
            focusHint={focusHint}
          />
        ) : stage ? (
          <StageConfigForm
            key={stage.id}
            stage={stage}
            saveState={saveState}
            onSave={(patch) => onSaveStage(stage.id, patch)}
            onStatusChange={onStatusChange}
            focusHint={focusHint}
          />
        ) : (
          <p className="text-sm text-os-muted">Selecione uma etapa ou bloco para configurar.</p>
        )}
      </div>
      {block && stage && (
        <div className="shrink-0 border-t border-os-border px-4 py-1">
          <MoreActionsMenu
            key={block.id}
            onDuplicate={() => onDuplicateBlock(stage.id, block.id)}
            onDelete={() => onDeleteBlock(stage.id, block.id)}
          />
        </div>
      )}
    </div>
  );
}
