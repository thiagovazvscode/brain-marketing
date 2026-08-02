"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2, Copy } from "lucide-react";
import type { PlaybookBlockRow, PlaybookStageRow, SimpleOption } from "@/types/methods";
import {
  DUE_OFFSET_ANCHORS,
  DURATION_UNITS,
  OVERDUE_ACTIONS,
  PLAYBOOK_ASSIGNEE_ROLES,
  PLAYBOOK_BLOCK_ASSIGNEE_TYPES,
  PLAYBOOK_BLOCK_PRIORITIES,
  playbookBlockTypeLabel,
} from "@/lib/methods";
import { Switch } from "@/components/admin/Switch";
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

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-os-border/70 pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-os-muted/80">{title}</h4>
      <div className="space-y-3">{children}</div>
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
}

function StageConfigForm({
  stage,
  saveState,
  onSave,
  onStatusChange,
}: {
  stage: PlaybookStageRow;
  saveState: SaveState;
  onSave: (patch: Partial<StageDraftFields>) => Promise<void>;
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void;
}) {
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
    <div className="space-y-4">
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
        <div>
          <label className={labelClass}>Nome</label>
          <input value={draft.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
        </div>
        <div>
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
        <div className="grid grid-cols-2 gap-2">
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
        <div>
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
  saveState,
  onSave,
  onStatusChange,
}: {
  block: PlaybookBlockRow;
  siblingBlocks: PlaybookBlockRow[];
  assigneeOptions: SimpleOption[];
  saveState: SaveState;
  onSave: (patch: Partial<BlockDraftFields>) => Promise<void>;
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void;
}) {
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
  }, onSave, onStatusChange);

  const isClientRequest = block.type === "client_request";
  const blockCode = `BL-${String(block.position + 1).padStart(3, "0")}`;

  const identification = (
    <FieldGroup title="Identificação">
      <div>
        <label className={labelClass}>Tipo</label>
        <p className="rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink">{playbookBlockTypeLabel(block.type)}</p>
      </div>
      <div>
        <label className={labelClass}>Título</label>
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

  // Responsável interno tem 3 modalidades — playbook é modelo reaplicável,
  // então travar num admin_user específico não faz sentido como padrão.
  // "Preservar o usuário atualmente selecionado": trocar a modalidade não
  // limpa os outros dois campos, só troca qual deles conta pra validação.
  const internalAssigneeField = (
    <>
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
    </>
  );

  const dueAndPriority = (
    <>
      <div className="grid grid-cols-2 gap-2">
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

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-os-ink">Configuração do Bloco</h3>
          <span className="rounded-full bg-os-bg px-2 py-0.5 text-[10px] font-bold text-os-muted">#{blockCode}</span>
        </div>
        <div className="mt-1">
          <PanelSaveStatus status={saveState} />
        </div>
      </div>

      {identification}

      {isClientRequest ? (
        <>
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
      ) : (
        <>
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
  saveState,
  onSaveStage,
  onSaveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onStatusChange,
}: {
  stage: PlaybookStageRow | null;
  block: PlaybookBlockRow | null;
  assigneeOptions: SimpleOption[];
  saveState: SaveState;
  onSaveStage: (stageId: string, patch: Partial<StageDraftFields>) => Promise<void>;
  onSaveBlock: (stageId: string, blockId: string, patch: Partial<BlockDraftFields>) => Promise<void>;
  onDuplicateBlock: (stageId: string, blockId: string) => void;
  onDeleteBlock: (stageId: string, blockId: string) => void;
  onStatusChange: (status: "pending" | "saving" | "saved" | "error") => void;
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
            saveState={saveState}
            onSave={(patch) => onSaveBlock(stage.id, block.id, patch)}
            onStatusChange={onStatusChange}
          />
        ) : stage ? (
          <StageConfigForm
            key={stage.id}
            stage={stage}
            saveState={saveState}
            onSave={(patch) => onSaveStage(stage.id, patch)}
            onStatusChange={onStatusChange}
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
