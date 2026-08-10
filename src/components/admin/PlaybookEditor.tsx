"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { X } from "lucide-react";
import type {
  PlaybookAnalysisCriterionRow,
  PlaybookAnalysisDimensionRow,
  PlaybookChecklistItemRow,
  PlaybookDeliverableComponentRow,
  PlaybookDeliverableMaterialRow,
  PlaybookEditorData,
  PlaybookFormQuestionRow,
  PlaybookStageRow,
  SimpleOption,
} from "@/types/methods";
import { PlaybookEditorHeader } from "@/components/admin/PlaybookEditorHeader";
import { PlaybookStagesColumn } from "@/components/admin/PlaybookStagesColumn";
import { PlaybookStageContent } from "@/components/admin/PlaybookStageContent";
import { PlaybookConfigPanel } from "@/components/admin/PlaybookConfigPanel";
import { StageFormPanel, type StageDraft } from "@/components/admin/StageFormPanel";
import { BlockTypePicker } from "@/components/admin/BlockTypePicker";
import { NewBlockDialog } from "@/components/admin/blocks/NewBlockDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PlaybookPreview } from "@/components/admin/PlaybookPreview";
import { PlaybookValidationModal } from "@/components/admin/PlaybookValidationPanel";
import { EmptyStagePlaceholder } from "@/components/admin/EmptyStagePlaceholder";
import type { FocusHint } from "@/components/admin/PlaybookConfigPanel";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

type Selection = { kind: "stage"; stageId: string } | { kind: "block"; stageId: string; blockId: string } | null;

type DeleteTarget = { kind: "stage"; stageId: string; blockCount: number; name: string } | { kind: "block"; stageId: string; blockId: string; title: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Falha na requisição.");
  return data as T;
}

export function PlaybookEditor({ initialData, assigneeOptions }: { initialData: PlaybookEditorData; assigneeOptions: SimpleOption[] }) {
  const router = useRouter();
  const base = `/api/admin/playbooks/${initialData.playbook.id}/versions/${initialData.version.id}`;

  const [stages, setStages] = useState<PlaybookStageRow[]>(initialData.stages);
  const [selection, setSelection] = useState<Selection>(
    initialData.stages[0] ? { kind: "stage", stageId: initialData.stages[0].id } : null
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showStageForm, setShowStageForm] = useState(false);
  const [blockPickerStageId, setBlockPickerStageId] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState<"meeting" | "checklist" | "form_briefing" | "document" | "analysis" | "deliverable" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationRefreshKey, setValidationRefreshKey] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [formQuestionError, setFormQuestionError] = useState<string | null>(null);
  const [analysisCriterionError, setAnalysisCriterionError] = useState<string | null>(null);
  const [deliverableComponentError, setDeliverableComponentError] = useState<string | null>(null);
  const [deliverableMaterialError, setDeliverableMaterialError] = useState<string | null>(null);
  const [focusHint, setFocusHint] = useState<FocusHint | null>(null);
  // Token por alvo de reorder (blockId p/ dimensões, dimensionId p/ critérios)
  // — incrementado a cada drag solto. Uma resposta (sucesso ou falha) só
  // mexe no estado se ainda for a mais recente pro alvo; senão é descartada,
  // pra nunca deixar uma requisição antiga sobrescrever um reorder mais novo
  // (ex.: dois arrastos rápidos em sequência).
  const reorderTokenRef = useRef<Record<string, number>>({});

  const selectedStage = selection ? stages.find((s) => s.id === selection.stageId) ?? null : null;
  const selectedBlock =
    selection?.kind === "block" ? selectedStage?.blocks.find((b) => b.id === selection.blockId) ?? null : null;

  async function refetch() {
    const data = await api<PlaybookEditorData>(`/api/admin/playbooks/${initialData.playbook.id}/editor`);
    setStages(data.stages);
    setValidationRefreshKey((k) => k + 1);
    return data;
  }

  function reportError(message: string) {
    setError(message);
    setSaveState("error");
  }

  // ── Etapas ──────────────────────────────────────────────────────────
  async function createStage(draft: StageDraft) {
    try {
      const payload = {
        name: draft.name,
        objective: draft.objective,
        description: draft.description,
        internalInstructions: draft.internalInstructions,
        durationValue: draft.durationValue ? Number(draft.durationValue) : null,
        durationUnit: draft.durationUnit,
        defaultAssigneeRole: draft.defaultAssigneeRole,
        isRequired: draft.isRequired,
        blocksNextStage: draft.blocksNextStage,
        completionCriteria: draft.completionCriteria,
        expectedDeliverable: draft.expectedDeliverable,
        priority: draft.priority,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const { stage } = await api<{ stage: PlaybookStageRow }>(`${base}/stages`, { method: "POST", body: JSON.stringify(payload) });
      setShowStageForm(false);
      await refetch();
      setSelection({ kind: "stage", stageId: stage.id });
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível criar a etapa.");
    }
  }

  async function duplicateStage(stageId: string) {
    try {
      const { stage } = await api<{ stage: PlaybookStageRow }>(`${base}/stages/${stageId}/duplicate`, { method: "POST" });
      await refetch();
      setSelection({ kind: "stage", stageId: stage.id });
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar a etapa.");
    }
  }

  function requestDeleteStage(stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    setDeleteTarget({ kind: "stage", stageId, blockCount: stage.blocks.length, name: stage.name });
  }

  async function confirmDeleteStage(stageId: string) {
    try {
      await api(`${base}/stages/${stageId}`, { method: "DELETE" });
      setDeleteTarget(null);
      if (selection?.stageId === stageId) setSelection(null);
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir a etapa.");
    }
  }

  async function reorderStages(orderedIds: string[]) {
    const previous = stages;
    const reordered = orderedIds.map((id, index) => {
      const stage = stages.find((s) => s.id === id)!;
      return { ...stage, position: index };
    });
    setStages(reordered);
    try {
      await api(`${base}/stages/reorder`, { method: "PATCH", body: JSON.stringify({ orderedIds }) });
    } catch {
      setStages(previous);
      reportError("Não foi possível reordenar as etapas.");
    }
  }

  // ── Blocos ──────────────────────────────────────────────────────────
  // internal_task/client_request continuam com criação imediata (Fase 2.1,
  // comportamento aprovado, não mexer). Os 4 tipos novos passam pelo diálogo
  // de configuração inicial (createRichBlock) — só criam ao salvar.
  async function createBlock(stageId: string, type: "internal_task" | "client_request") {
    try {
      const defaultTitle = type === "internal_task" ? "Nova tarefa interna" : "Nova solicitação ao cliente";
      const { block } = await api<{ block: { id: string } }>(`${base}/stages/${stageId}/blocks`, {
        method: "POST",
        body: JSON.stringify({ type, title: defaultTitle }),
      });
      setBlockPickerStageId(null);
      await refetch();
      setSelection({ kind: "block", stageId, blockId: block.id });
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível criar o bloco.");
    }
  }

  async function createRichBlock(
    stageId: string,
    type: "meeting" | "checklist" | "form_briefing" | "document" | "analysis" | "deliverable",
    payload: {
      title: string;
      metadata?: Record<string, unknown>;
      expectedResult?: string;
      checklistItems?: { title: string }[];
      questions?: { label: string; questionType: string }[];
    }
  ) {
    const { block } = await api<{ block: { id: string } }>(`${base}/stages/${stageId}/blocks`, {
      method: "POST",
      body: JSON.stringify({ type, title: payload.title, metadata: payload.metadata, expectedResult: payload.expectedResult }),
    });

    // Itens/perguntas escolhidos na criação são criados em sequência
    // (posição calculada no servidor a cada chamada) — só depois que o
    // bloco em si já existe.
    if (payload.checklistItems) {
      for (const item of payload.checklistItems) {
        await api(`${base}/stages/${stageId}/blocks/${block.id}/checklist-items`, { method: "POST", body: JSON.stringify(item) });
      }
    }
    if (payload.questions) {
      for (const q of payload.questions) {
        await api(`${base}/stages/${stageId}/blocks/${block.id}/questions`, { method: "POST", body: JSON.stringify(q) });
      }
    }

    setNewBlockType(null);
    setBlockPickerStageId(null);
    await refetch();
    setSelection({ kind: "block", stageId, blockId: block.id });
    setConfigOpen(true);
  }

  async function duplicateBlock(stageId: string, blockId: string) {
    try {
      const { block } = await api<{ block: { id: string } }>(`${base}/stages/${stageId}/blocks/${blockId}/duplicate`, { method: "POST" });
      await refetch();
      setSelection({ kind: "block", stageId, blockId: block.id });
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar o bloco.");
    }
  }

  function requestDeleteBlock(stageId: string, blockId: string) {
    const stage = stages.find((s) => s.id === stageId);
    const block = stage?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    setDeleteTarget({ kind: "block", stageId, blockId, title: block.title });
  }

  async function confirmDeleteBlock(stageId: string, blockId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}`, { method: "DELETE" });
      setDeleteTarget(null);
      if (selection?.kind === "block" && selection.blockId === blockId) setSelection({ kind: "stage", stageId });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir o bloco.");
    }
  }

  async function reorderBlocks(stageId: string, orderedIds: string[]) {
    const previous = stages;
    setStages((cur) =>
      cur.map((s) => {
        if (s.id !== stageId) return s;
        const reordered = orderedIds.map((id, index) => ({ ...s.blocks.find((b) => b.id === id)!, position: index }));
        return { ...s, blocks: reordered };
      })
    );
    try {
      await api(`${base}/stages/${stageId}/blocks/reorder`, { method: "PATCH", body: JSON.stringify({ orderedIds }) });
    } catch {
      setStages(previous);
      reportError("Não foi possível reordenar os blocos.");
    }
  }

  // ── Itens de checklist ────────────────────────────────────────────────
  async function createChecklistItem(stageId: string, blockId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/checklist-items`, { method: "POST", body: JSON.stringify({ title: "Novo item" }) });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível criar o item.");
    }
  }

  async function updateChecklistItem(stageId: string, blockId: string, itemId: string, patch: Record<string, unknown>) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/checklist-items/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível atualizar o item.");
    }
  }

  // Duplicar item/pergunta reaproveita o mesmo endpoint de criação (já
  // aceita todos os campos) — sem rota nova, sem migration.
  async function duplicateChecklistItem(stageId: string, blockId: string, item: PlaybookChecklistItemRow) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/checklist-items`, {
        method: "POST",
        body: JSON.stringify({
          title: `${item.title} (cópia)`,
          description: item.description ?? undefined,
          groupName: item.groupName ?? undefined,
          isRequired: item.isRequired,
          requiresEvidence: item.requiresEvidence,
          allowsNotes: item.allowsNotes,
        }),
      });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar o item.");
    }
  }

  async function deleteChecklistItem(stageId: string, blockId: string, itemId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/checklist-items/${itemId}`, { method: "DELETE" });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir o item.");
    }
  }

  async function reorderChecklistItems(stageId: string, blockId: string, orderedIds: string[]) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/checklist-items/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível reordenar os itens.");
    }
  }

  // ── Perguntas de formulário ──────────────────────────────────────────
  // Erro de validação de opções/tipo mostra no próprio construtor central
  // (formQuestionError), não no banner global — é sobre um campo específico.
  async function createQuestion(stageId: string, blockId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/questions`, { method: "POST", body: JSON.stringify({ label: "Nova pergunta", questionType: "texto_curto" }) });
      setFormQuestionError(null);
      await refetch();
    } catch (e) {
      setFormQuestionError(e instanceof Error ? e.message : "Não foi possível criar a pergunta.");
    }
  }

  async function updateQuestion(stageId: string, blockId: string, questionId: string, patch: Record<string, unknown>) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/questions/${questionId}`, { method: "PATCH", body: JSON.stringify(patch) });
      setFormQuestionError(null);
      await refetch();
    } catch (e) {
      setFormQuestionError(e instanceof Error ? e.message : "Não foi possível atualizar a pergunta.");
    }
  }

  async function duplicateQuestion(stageId: string, blockId: string, question: PlaybookFormQuestionRow) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          label: `${question.label} (cópia)`,
          helpText: question.helpText ?? undefined,
          questionType: question.questionType,
          placeholder: question.placeholder ?? undefined,
          options: question.options,
          validation: question.validation ?? undefined,
          sectionName: question.sectionName ?? undefined,
          isRequired: question.isRequired,
        }),
      });
      setFormQuestionError(null);
      await refetch();
    } catch (e) {
      setFormQuestionError(e instanceof Error ? e.message : "Não foi possível duplicar a pergunta.");
    }
  }

  async function deleteQuestion(stageId: string, blockId: string, questionId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/questions/${questionId}`, { method: "DELETE" });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir a pergunta.");
    }
  }

  async function reorderQuestions(stageId: string, blockId: string, orderedIds: string[]) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/questions/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível reordenar as perguntas.");
    }
  }

  // Fontes/conclusões da Análise moram em metadata (não em tabela própria —
  // ver AnalysisBlockMetadata) e são editadas no centro (construtor), não no
  // painel direito — por isso um patch dedicado que faz merge com o
  // metadata já salvo, em vez de exigir o objeto inteiro a cada chamada.
  async function updateBlockMetadata(stageId: string, blockId: string, metadataPatch: Record<string, unknown>) {
    const stage = stages.find((s) => s.id === stageId);
    const block = stage?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}`, {
        method: "PATCH",
        body: JSON.stringify({ metadata: { ...(block.metadata ?? {}), ...metadataPatch } }),
      });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  // ── Dimensões e critérios de Análise (Fase 2.2B.1) ───────────────────
  async function createDimension(stageId: string, blockId: string, name: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims`, { method: "POST", body: JSON.stringify({ name }) });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível criar a dimensão.");
    }
  }

  async function updateDimension(stageId: string, blockId: string, dimensionId: string, patch: Record<string, unknown>) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}`, { method: "PATCH", body: JSON.stringify(patch) });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível atualizar a dimensão.");
    }
  }

  async function duplicateDimension(stageId: string, blockId: string, dimension: PlaybookAnalysisDimensionRow) {
    try {
      const { dimension: created } = await api<{ dimension: { id: string } }>(`${base}/stages/${stageId}/blocks/${blockId}/dims`, {
        method: "POST",
        body: JSON.stringify({ name: `${dimension.name} (cópia)`, description: dimension.description ?? undefined, weight: dimension.weight }),
      });
      for (const criterion of dimension.criteria) {
        await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${created.id}/crit`, {
          method: "POST",
          body: JSON.stringify({
            name: criterion.name,
            description: criterion.description ?? undefined,
            evaluationType: criterion.evaluationType,
            weight: criterion.weight,
            isRequired: criterion.isRequired,
            requiresEvidence: criterion.requiresEvidence,
            evidenceDescription: criterion.evidenceDescription ?? undefined,
            guidance: criterion.guidance ?? undefined,
            options: criterion.options,
          }),
        });
      }
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar a dimensão.");
    }
  }

  async function deleteDimension(stageId: string, blockId: string, dimensionId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}`, { method: "DELETE" });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir a dimensão.");
    }
  }

  // Reordena localmente sem tocar em nenhum outro campo — preserva seleção,
  // estado aberto/fechado e drafts não salvos de outros campos, já que tudo
  // isso é local ao componente da linha e segue pela `key={id}`, não pelo
  // índice no array.
  function applyDimensionOrder(stageId: string, blockId: string, orderedIds: string[]) {
    setStages((cur) =>
      cur.map((s) => {
        if (s.id !== stageId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const byId = new Map(b.analysisDimensions.map((d) => [d.id, d]));
            const reordered = orderedIds.map((id, index) => ({ ...byId.get(id)!, position: index }));
            return { ...b, analysisDimensions: reordered };
          }),
        };
      })
    );
  }

  // Otimista: a UI assume a nova ordem no mesmo tick do drop, antes de
  // qualquer chamada de rede — sem isso, arrastar parece travado porque o
  // usuário só via a lista mudar depois do POST completar E de um refetch
  // completo do playbook inteiro. Persistência roda em segundo plano; falha
  // desfaz só se ainda for a tentativa mais recente (ver reorderTokenRef).
  async function reorderDimensions(stageId: string, blockId: string, orderedIds: string[]) {
    const block = stages.find((s) => s.id === stageId)?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const previousOrder = block.analysisDimensions.map((d) => d.id);
    const key = `dims:${blockId}`;
    const token = (reorderTokenRef.current[key] ?? 0) + 1;
    reorderTokenRef.current[key] = token;

    applyDimensionOrder(stageId, blockId, orderedIds);
    setSaveState("saving");
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });
      if (reorderTokenRef.current[key] !== token) return;
      setSaveState("saved");
    } catch {
      if (reorderTokenRef.current[key] !== token) return;
      applyDimensionOrder(stageId, blockId, previousOrder);
      reportError("Não foi possível salvar a nova ordem.");
    }
  }

  async function createCriterion(stageId: string, blockId: string, dimensionId: string, name: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}/crit`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setAnalysisCriterionError(null);
      await refetch();
    } catch (e) {
      setAnalysisCriterionError(e instanceof Error ? e.message : "Não foi possível criar o critério.");
    }
  }

  async function updateCriterion(stageId: string, blockId: string, dimensionId: string, criterionId: string, patch: Record<string, unknown>) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}/crit/${criterionId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setAnalysisCriterionError(null);
      await refetch();
    } catch (e) {
      setAnalysisCriterionError(e instanceof Error ? e.message : "Não foi possível atualizar o critério.");
    }
  }

  async function duplicateCriterion(stageId: string, blockId: string, dimensionId: string, criterion: PlaybookAnalysisCriterionRow) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}/crit`, {
        method: "POST",
        body: JSON.stringify({
          name: `${criterion.name} (cópia)`,
          description: criterion.description ?? undefined,
          evaluationType: criterion.evaluationType,
          weight: criterion.weight,
          isRequired: criterion.isRequired,
          requiresEvidence: criterion.requiresEvidence,
          evidenceDescription: criterion.evidenceDescription ?? undefined,
          guidance: criterion.guidance ?? undefined,
          options: criterion.options,
        }),
      });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar o critério.");
    }
  }

  async function deleteCriterion(stageId: string, blockId: string, dimensionId: string, criterionId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}/crit/${criterionId}`, { method: "DELETE" });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir o critério.");
    }
  }

  // Mesmo raciocínio de applyDimensionOrder, escopado à dimensão — o
  // reorder de critérios nunca mexe em outra dimensão porque orderedIds
  // sempre vem do array `dimension.criteria` de uma dimensão só (ver
  // AnalysisBuilder), e aqui só o array `criteria` daquela dimensionId é
  // substituído.
  function applyCriteriaOrder(stageId: string, blockId: string, dimensionId: string, orderedIds: string[]) {
    setStages((cur) =>
      cur.map((s) => {
        if (s.id !== stageId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b) => {
            if (b.id !== blockId) return b;
            return {
              ...b,
              analysisDimensions: b.analysisDimensions.map((d) => {
                if (d.id !== dimensionId) return d;
                const byId = new Map(d.criteria.map((c) => [c.id, c]));
                const reordered = orderedIds.map((id, index) => ({ ...byId.get(id)!, position: index }));
                return { ...d, criteria: reordered };
              }),
            };
          }),
        };
      })
    );
  }

  async function reorderCriteria(stageId: string, blockId: string, dimensionId: string, orderedIds: string[]) {
    const dimension = stages
      .find((s) => s.id === stageId)
      ?.blocks.find((b) => b.id === blockId)
      ?.analysisDimensions.find((d) => d.id === dimensionId);
    if (!dimension) return;
    const previousOrder = dimension.criteria.map((c) => c.id);
    const key = `crit:${dimensionId}`;
    const token = (reorderTokenRef.current[key] ?? 0) + 1;
    reorderTokenRef.current[key] = token;

    applyCriteriaOrder(stageId, blockId, dimensionId, orderedIds);
    setSaveState("saving");
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/dims/${dimensionId}/crit/reorder`, {
        method: "POST",
        body: JSON.stringify({ orderedIds }),
      });
      if (reorderTokenRef.current[key] !== token) return;
      setSaveState("saved");
    } catch {
      if (reorderTokenRef.current[key] !== token) return;
      applyCriteriaOrder(stageId, blockId, dimensionId, previousOrder);
      reportError("Não foi possível salvar a nova ordem.");
    }
  }

  // ── Componentes de Entregável (Fase 2.2B.2A) ─────────────────────────
  async function createDeliverableComponent(stageId: string, blockId: string, title: string, componentType: string, expectedFormat: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-components`, {
        method: "POST",
        body: JSON.stringify({ title, componentType, expectedFormat }),
      });
      setDeliverableComponentError(null);
      await refetch();
    } catch (e) {
      setDeliverableComponentError(e instanceof Error ? e.message : "Não foi possível criar o componente.");
    }
  }

  async function updateDeliverableComponent(stageId: string, blockId: string, componentId: string, patch: Record<string, unknown>) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-components/${componentId}`, { method: "PATCH", body: JSON.stringify(patch) });
      setDeliverableComponentError(null);
      await refetch();
    } catch (e) {
      setDeliverableComponentError(e instanceof Error ? e.message : "Não foi possível atualizar o componente.");
    }
  }

  // Duplicar reaproveita o mesmo endpoint de criação com os campos
  // essenciais copiados, depois um PATCH pros demais campos — mesmo padrão
  // já usado por duplicateDimension/duplicateCriterion (Análise): o projeto
  // não tem endpoint dedicado de duplicação abaixo do nível de bloco.
  async function duplicateDeliverableComponent(stageId: string, blockId: string, component: PlaybookDeliverableComponentRow) {
    try {
      const { component: created } = await api<{ component: { id: string } }>(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-components`, {
        method: "POST",
        body: JSON.stringify({
          title: `${component.title} (cópia)`,
          componentType: component.componentType,
          expectedFormat: component.expectedFormat,
          description: component.description ?? undefined,
        }),
      });
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-components/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isRequired: component.isRequired,
          defaultAssigneeType: component.defaultAssigneeType,
          defaultAssigneeRole: component.defaultAssigneeRole ?? undefined,
          defaultAssigneeId: component.defaultAssigneeId ?? undefined,
          acceptanceCriteria: component.acceptanceCriteria ?? undefined,
        }),
      });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar o componente.");
    }
  }

  async function deleteDeliverableComponent(stageId: string, blockId: string, componentId: string) {
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-components/${componentId}`, { method: "DELETE" });
      await refetch();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível excluir o componente.");
    }
  }

  // Mesmo raciocínio de applyDimensionOrder — reordena localmente sem tocar
  // em nenhum outro campo, preserva seleção e drafts locais de outros
  // componentes (tudo segue por `key={id}`, não por índice).
  function applyDeliverableComponentOrder(stageId: string, blockId: string, orderedIds: string[]) {
    setStages((cur) =>
      cur.map((s) => {
        if (s.id !== stageId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const byId = new Map(b.deliverableComponents.map((c) => [c.id, c]));
            const reordered = orderedIds.map((id, index) => ({ ...byId.get(id)!, position: index }));
            return { ...b, deliverableComponents: reordered };
          }),
        };
      })
    );
  }

  // Otimista, mesmo mecanismo (token incremental) de reorderDimensions —
  // aplica a ordem local no mesmo tick do drop, persiste em segundo plano, e
  // uma resposta (sucesso ou falha) só mexe no estado se ainda for a
  // tentativa mais recente pra este bloco.
  async function reorderDeliverableComponents(stageId: string, blockId: string, orderedIds: string[]) {
    const block = stages.find((s) => s.id === stageId)?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const previousOrder = block.deliverableComponents.map((c) => c.id);
    const key = `deliverable-components:${blockId}`;
    const token = (reorderTokenRef.current[key] ?? 0) + 1;
    reorderTokenRef.current[key] = token;

    applyDeliverableComponentOrder(stageId, blockId, orderedIds);
    setSaveState("saving");
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-components/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });
      if (reorderTokenRef.current[key] !== token) return;
      setSaveState("saved");
    } catch {
      if (reorderTokenRef.current[key] !== token) return;
      applyDeliverableComponentOrder(stageId, blockId, previousOrder);
      reportError("Não foi possível salvar a nova ordem.");
    }
  }

  // ── Materiais de Entregável (Fase 2.2B.2B.4UI) — mesmo padrão de
  // create/update/duplicate/delete de componentes acima (await + refetch);
  // reorder é o único otimista (token incremental + rollback), mesma regra
  // de reorderDeliverableComponents. Diferente dos componentes, cria/edita/
  // duplica/exclui também passam por setSaveState — dá o feedback
  // "Salvando.../Salvo/Erro ao salvar" pedido pra esta aba (item 14),
  // reaproveitando o indicador global que reorder já usa. ─────────────────
  async function createDeliverableMaterial(stageId: string, blockId: string, name: string, materialType: string, origin: string): Promise<string | null> {
    setSaveState("saving");
    try {
      const { material } = await api<{ material: { id: string } }>(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-materials`, {
        method: "POST",
        body: JSON.stringify({ name, materialType, origin }),
      });
      setDeliverableMaterialError(null);
      await refetch();
      setSaveState("saved");
      return material.id;
    } catch (e) {
      setDeliverableMaterialError(e instanceof Error ? e.message : "Não foi possível criar o material.");
      setSaveState("error");
      return null;
    }
  }

  async function updateDeliverableMaterial(stageId: string, blockId: string, materialId: string, patch: Record<string, unknown>) {
    setSaveState("saving");
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-materials/${materialId}`, { method: "PATCH", body: JSON.stringify(patch) });
      setDeliverableMaterialError(null);
      await refetch();
      setSaveState("saved");
    } catch (e) {
      setDeliverableMaterialError(e instanceof Error ? e.message : "Não foi possível atualizar o material.");
      setSaveState("error");
    }
  }

  // Duplicar reaproveita o mesmo endpoint de criação com os campos
  // essenciais copiados, depois um PATCH pros demais campos — mesmo padrão
  // de duplicateDeliverableComponent (o projeto não tem endpoint dedicado
  // de duplicação abaixo do nível de bloco). beforeComponentId/resourceId/
  // assigneeId são preservados como vieram do original: a duplicação
  // acontece dentro do MESMO bloco, então continuam válidos sem remapear.
  async function duplicateDeliverableMaterial(stageId: string, blockId: string, material: PlaybookDeliverableMaterialRow) {
    setSaveState("saving");
    try {
      const { material: created } = await api<{ material: { id: string } }>(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-materials`, {
        method: "POST",
        body: JSON.stringify({
          name: `${material.name} (cópia)`,
          materialType: material.materialType,
          origin: material.origin,
          description: material.description ?? undefined,
        }),
      });
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-materials/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isRequired: material.isRequired,
          assigneeType: material.assigneeType,
          assigneeRole: material.assigneeRole ?? undefined,
          assigneeId: material.assigneeId ?? undefined,
          requiredMoment: material.requiredMoment,
          beforeComponentId: material.beforeComponentId ?? undefined,
          url: material.url ?? undefined,
          resourceId: material.resourceId ?? undefined,
        }),
      });
      await refetch();
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      reportError(e instanceof Error ? e.message : "Não foi possível duplicar o material.");
    }
  }

  async function deleteDeliverableMaterial(stageId: string, blockId: string, materialId: string) {
    setSaveState("saving");
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-materials/${materialId}`, { method: "DELETE" });
      await refetch();
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      reportError(e instanceof Error ? e.message : "Não foi possível excluir o material.");
    }
  }

  // Mesmo raciocínio de applyDeliverableComponentOrder — reordena localmente
  // sem tocar em nenhum outro campo.
  function applyDeliverableMaterialOrder(stageId: string, blockId: string, orderedIds: string[]) {
    setStages((cur) =>
      cur.map((s) => {
        if (s.id !== stageId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const byId = new Map(b.materials.map((m) => [m.id, m]));
            const reordered = orderedIds.map((id, index) => ({ ...byId.get(id)!, position: index }));
            return { ...b, materials: reordered };
          }),
        };
      })
    );
  }

  // Otimista, mesmo mecanismo (token incremental) de reorderDeliverableComponents.
  async function reorderDeliverableMaterials(stageId: string, blockId: string, orderedIds: string[]) {
    const block = stages.find((s) => s.id === stageId)?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const previousOrder = block.materials.map((m) => m.id);
    const key = `deliverable-materials:${blockId}`;
    const token = (reorderTokenRef.current[key] ?? 0) + 1;
    reorderTokenRef.current[key] = token;

    applyDeliverableMaterialOrder(stageId, blockId, orderedIds);
    setSaveState("saving");
    try {
      await api(`${base}/stages/${stageId}/blocks/${blockId}/deliverable-materials/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });
      if (reorderTokenRef.current[key] !== token) return;
      setSaveState("saved");
    } catch {
      if (reorderTokenRef.current[key] !== token) return;
      applyDeliverableMaterialOrder(stageId, blockId, previousOrder);
      reportError("Não foi possível salvar a nova ordem dos materiais.");
    }
  }

  // ── Autosave (config panel) ──────────────────────────────────────────
  async function saveStage(stageId: string, patch: Record<string, unknown>) {
    const { stage } = await api<{ stage: PlaybookStageRow }>(`${base}/stages/${stageId}`, { method: "PATCH", body: JSON.stringify(patch) });
    setStages((cur) => cur.map((s) => (s.id === stageId ? { ...s, ...stage } : s)));
    setValidationRefreshKey((k) => k + 1);
  }

  async function saveBlock(stageId: string, blockId: string, patch: Record<string, unknown>) {
    const { block } = await api<{ block: PlaybookStageRow["blocks"][number] }>(`${base}/stages/${stageId}/blocks/${blockId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setStages((cur) =>
      cur.map((s) => (s.id === stageId ? { ...s, blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...block } : b)) } : s))
    );
    setValidationRefreshKey((k) => k + 1);
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const validation = await api<{ canPublish: boolean }>(`${base}/validate`);
      if (!validation.canPublish) {
        setShowValidation(true);
        return;
      }
      await api(`/api/admin/playbooks/${initialData.playbook.id}/publish`, { method: "POST" });
      router.refresh();
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Não foi possível publicar o playbook.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <PlaybookEditorHeader
        playbookId={initialData.playbook.id}
        playbookName={initialData.playbook.name}
        methodName={initialData.method?.name ?? null}
        productName={initialData.product?.name ?? null}
        version={initialData.version.versionLabel}
        status={initialData.version.status}
        saveState={saveState}
        totalStages={stages.length}
        totalBlocks={stages.reduce((sum, s) => sum + s.blocks.length, 0)}
        onPreview={() => setShowPreview(true)}
        onValidate={() => setShowValidation(true)}
        onPublish={handlePublish}
        publishing={publishing}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="font-bold underline">
            fechar
          </button>
        </div>
      )}

      {stages.length === 0 ? (
        <EmptyStagePlaceholder onCreate={() => setShowStageForm(true)} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(280px,300px)_minmax(0,1fr)_minmax(390px,420px)]">
          <PlaybookStagesColumn
            playbookId={initialData.playbook.id}
            stages={stages}
            selectedStageId={selectedStage?.id ?? null}
            onSelect={(stageId) => {
              setSelection({ kind: "stage", stageId });
              setConfigOpen(true);
            }}
            onCreate={() => setShowStageForm(true)}
            onEdit={(stageId) => {
              setSelection({ kind: "stage", stageId });
              setConfigOpen(true);
            }}
            onDuplicate={duplicateStage}
            onDelete={requestDeleteStage}
            onReorder={reorderStages}
          />
          <PlaybookStageContent
            stage={selectedStage}
            totalStages={stages.length}
            selectedBlockId={selectedBlock?.id ?? null}
            selectedBlock={selectedBlock}
            assigneeOptions={assigneeOptions}
            onSelectBlock={(blockId) => {
              if (selectedStage) {
                setSelection({ kind: "block", stageId: selectedStage.id, blockId });
                setConfigOpen(true);
              }
            }}
            onBack={() => selectedStage && setSelection({ kind: "stage", stageId: selectedStage.id })}
            onAddBlock={() => selectedStage && setBlockPickerStageId(selectedStage.id)}
            onDuplicateBlock={(blockId) => selectedStage && duplicateBlock(selectedStage.id, blockId)}
            onDeleteBlock={(blockId) => selectedStage && requestDeleteBlock(selectedStage.id, blockId)}
            onReorderBlocks={(orderedIds) => selectedStage && reorderBlocks(selectedStage.id, orderedIds)}
            onCreateChecklistItem={(blockId) => selectedStage && createChecklistItem(selectedStage.id, blockId)}
            onUpdateChecklistItem={(blockId, itemId, patch) => selectedStage && updateChecklistItem(selectedStage.id, blockId, itemId, patch)}
            onDeleteChecklistItem={(blockId, itemId) => selectedStage && deleteChecklistItem(selectedStage.id, blockId, itemId)}
            onDuplicateChecklistItem={(blockId, item) => selectedStage && duplicateChecklistItem(selectedStage.id, blockId, item)}
            onReorderChecklistItems={(blockId, orderedIds) => selectedStage && reorderChecklistItems(selectedStage.id, blockId, orderedIds)}
            onCreateQuestion={(blockId) => selectedStage && createQuestion(selectedStage.id, blockId)}
            onUpdateQuestion={(blockId, questionId, patch) => selectedStage && updateQuestion(selectedStage.id, blockId, questionId, patch)}
            onDeleteQuestion={(blockId, questionId) => selectedStage && deleteQuestion(selectedStage.id, blockId, questionId)}
            onDuplicateQuestion={(blockId, question) => selectedStage && duplicateQuestion(selectedStage.id, blockId, question)}
            onReorderQuestions={(blockId, orderedIds) => selectedStage && reorderQuestions(selectedStage.id, blockId, orderedIds)}
            formQuestionError={formQuestionError}
            onCreateDimension={(blockId, name) => selectedStage && createDimension(selectedStage.id, blockId, name)}
            onUpdateDimension={(blockId, dimensionId, patch) => selectedStage && updateDimension(selectedStage.id, blockId, dimensionId, patch)}
            onDuplicateDimension={(blockId, dimension) => selectedStage && duplicateDimension(selectedStage.id, blockId, dimension)}
            onDeleteDimension={(blockId, dimensionId) => selectedStage && deleteDimension(selectedStage.id, blockId, dimensionId)}
            onReorderDimensions={(blockId, orderedIds) => selectedStage && reorderDimensions(selectedStage.id, blockId, orderedIds)}
            onCreateCriterion={(blockId, dimensionId, name) => selectedStage && createCriterion(selectedStage.id, blockId, dimensionId, name)}
            onUpdateCriterion={(blockId, dimensionId, criterionId, patch) =>
              selectedStage && updateCriterion(selectedStage.id, blockId, dimensionId, criterionId, patch)
            }
            onDuplicateCriterion={(blockId, dimensionId, criterion) => selectedStage && duplicateCriterion(selectedStage.id, blockId, dimensionId, criterion)}
            onDeleteCriterion={(blockId, dimensionId, criterionId) => selectedStage && deleteCriterion(selectedStage.id, blockId, dimensionId, criterionId)}
            onReorderCriteria={(blockId, dimensionId, orderedIds) => selectedStage && reorderCriteria(selectedStage.id, blockId, dimensionId, orderedIds)}
            analysisCriterionError={analysisCriterionError}
            onCreateDeliverableComponent={(blockId, title, componentType, expectedFormat) =>
              selectedStage && createDeliverableComponent(selectedStage.id, blockId, title, componentType, expectedFormat)
            }
            onUpdateDeliverableComponent={(blockId, componentId, patch) => selectedStage && updateDeliverableComponent(selectedStage.id, blockId, componentId, patch)}
            onDuplicateDeliverableComponent={(blockId, component) => selectedStage && duplicateDeliverableComponent(selectedStage.id, blockId, component)}
            onDeleteDeliverableComponent={(blockId, componentId) => selectedStage && deleteDeliverableComponent(selectedStage.id, blockId, componentId)}
            onReorderDeliverableComponents={(blockId, orderedIds) => selectedStage && reorderDeliverableComponents(selectedStage.id, blockId, orderedIds)}
            deliverableComponentError={deliverableComponentError}
            onCreateDeliverableMaterial={(blockId, name, materialType, origin) =>
              selectedStage ? createDeliverableMaterial(selectedStage.id, blockId, name, materialType, origin) : Promise.resolve(null)
            }
            onUpdateDeliverableMaterial={(blockId, materialId, patch) => selectedStage && updateDeliverableMaterial(selectedStage.id, blockId, materialId, patch)}
            onDuplicateDeliverableMaterial={(blockId, material) => selectedStage && duplicateDeliverableMaterial(selectedStage.id, blockId, material)}
            onDeleteDeliverableMaterial={(blockId, materialId) => selectedStage && deleteDeliverableMaterial(selectedStage.id, blockId, materialId)}
            onReorderDeliverableMaterials={(blockId, orderedIds) => selectedStage && reorderDeliverableMaterials(selectedStage.id, blockId, orderedIds)}
            deliverableMaterialError={deliverableMaterialError}
            onUpdateBlockMetadata={(blockId, patch) => selectedStage && updateBlockMetadata(selectedStage.id, blockId, patch)}
            resourceOptions={initialData.resources}
            focusHint={focusHint}
          />

          {/* Painel de configuração: coluna fixa e sticky em desktop (xl+);
              vira drawer com fundo escurecido em telas menores, aberto ao
              selecionar etapa/bloco e fechado pelo X — só a apresentação
              muda, o painel em si (PlaybookConfigPanel) é o mesmo. */}
          <div
            className={
              configOpen
                ? "fixed inset-0 z-40 flex justify-end bg-black/40 p-4 xl:static xl:z-auto xl:block xl:bg-transparent xl:p-0"
                : "hidden xl:block"
            }
            onClick={() => setConfigOpen(false)}
          >
            <div
              className="flex h-full w-full max-w-sm flex-col gap-2 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:w-auto xl:max-w-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setConfigOpen(false)}
                className="flex items-center justify-end gap-1 self-end text-xs font-bold text-os-muted hover:text-os-ink xl:hidden"
              >
                <X className="h-4 w-4" /> Fechar
              </button>
              <div className="min-h-0 flex-1">
                <PlaybookConfigPanel
                  stage={selectedStage}
                  block={selectedBlock}
                  assigneeOptions={assigneeOptions}
                  resourceOptions={initialData.resources}
                  saveState={saveState}
                  onSaveStage={saveStage}
                  onSaveBlock={saveBlock}
                  onDuplicateBlock={duplicateBlock}
                  onDeleteBlock={requestDeleteBlock}
                  onStatusChange={setSaveState}
                  focusHint={focusHint}
                  onOpenMaterialsTab={() => setFocusHint({ openTab: "materials", nonce: Date.now() })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showStageForm && <StageFormPanel onCancel={() => setShowStageForm(false)} onSubmit={createStage} />}

      {blockPickerStageId && !newBlockType && (
        <BlockTypePicker
          onCancel={() => setBlockPickerStageId(null)}
          onSelect={(type) => {
            if (type === "internal_task" || type === "client_request") {
              createBlock(blockPickerStageId, type);
            } else {
              setNewBlockType(type);
            }
          }}
        />
      )}

      {blockPickerStageId && newBlockType && (
        <NewBlockDialog
          type={newBlockType}
          onCancel={() => {
            setNewBlockType(null);
            setBlockPickerStageId(null);
          }}
          onSubmit={(payload) => createRichBlock(blockPickerStageId, newBlockType, payload)}
        />
      )}

      {deleteTarget?.kind === "stage" && (
        <ConfirmDialog
          title={`Excluir "${deleteTarget.name}"?`}
          description={`${deleteTarget.blockCount} ${deleteTarget.blockCount === 1 ? "bloco" : "blocos"} desta etapa também ${deleteTarget.blockCount === 1 ? "será excluído" : "serão excluídos"}. A operação afeta somente o rascunho.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => confirmDeleteStage(deleteTarget.stageId)}
        />
      )}

      {deleteTarget?.kind === "block" && (
        <ConfirmDialog
          title={`Excluir "${deleteTarget.title}"?`}
          description="A operação afeta somente o rascunho."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => confirmDeleteBlock(deleteTarget.stageId, deleteTarget.blockId)}
        />
      )}

      {showPreview && (
        <PlaybookPreview
          playbookName={initialData.playbook.name}
          version={initialData.version.versionLabel}
          stages={stages}
          assigneeOptions={assigneeOptions}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showValidation && (
        <PlaybookValidationModal
          playbookId={initialData.playbook.id}
          versionId={initialData.version.id}
          refreshKey={validationRefreshKey}
          onSelectIssue={(issue) => {
            const stageId = issue.stageId;
            if (!stageId) return;
            setSelection(issue.blockId ? { kind: "block", stageId, blockId: issue.blockId } : { kind: "stage", stageId });
            setConfigOpen(true);
            setShowValidation(false);
            setFocusHint({
              field: issue.field,
              dimensionId: issue.dimensionId,
              criterionId: issue.criterionId,
              componentId: issue.componentId,
              materialId: issue.materialId,
              qualityCriterionId: issue.qualityCriterionId,
              nonce: Date.now(),
            });
          }}
          onClose={() => setShowValidation(false)}
        />
      )}
    </div>
  );
}
