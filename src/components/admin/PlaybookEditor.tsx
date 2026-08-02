"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import type { PlaybookEditorData, PlaybookStageRow, SimpleOption } from "@/types/methods";
import { PlaybookEditorHeader } from "@/components/admin/PlaybookEditorHeader";
import { PlaybookStagesColumn } from "@/components/admin/PlaybookStagesColumn";
import { PlaybookStageContent } from "@/components/admin/PlaybookStageContent";
import { PlaybookConfigPanel } from "@/components/admin/PlaybookConfigPanel";
import { StageFormPanel, type StageDraft } from "@/components/admin/StageFormPanel";
import { BlockTypePicker } from "@/components/admin/BlockTypePicker";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PlaybookPreview } from "@/components/admin/PlaybookPreview";
import { PlaybookValidationPanel } from "@/components/admin/PlaybookValidationPanel";
import { EmptyStagePlaceholder } from "@/components/admin/EmptyStagePlaceholder";

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
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationRefreshKey, setValidationRefreshKey] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

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
            assigneeOptions={assigneeOptions}
            onSelectBlock={(blockId) => {
              if (selectedStage) {
                setSelection({ kind: "block", stageId: selectedStage.id, blockId });
                setConfigOpen(true);
              }
            }}
            onAddBlock={() => selectedStage && setBlockPickerStageId(selectedStage.id)}
            onDuplicateBlock={(blockId) => selectedStage && duplicateBlock(selectedStage.id, blockId)}
            onDeleteBlock={(blockId) => selectedStage && requestDeleteBlock(selectedStage.id, blockId)}
            onReorderBlocks={(orderedIds) => selectedStage && reorderBlocks(selectedStage.id, orderedIds)}
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
                  saveState={saveState}
                  onSaveStage={saveStage}
                  onSaveBlock={saveBlock}
                  onDuplicateBlock={duplicateBlock}
                  onDeleteBlock={requestDeleteBlock}
                  onStatusChange={setSaveState}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showStageForm && <StageFormPanel onCancel={() => setShowStageForm(false)} onSubmit={createStage} />}

      {blockPickerStageId && (
        <BlockTypePicker onCancel={() => setBlockPickerStageId(null)} onSelect={(type) => createBlock(blockPickerStageId, type)} />
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
          onClose={() => setShowPreview(false)}
        />
      )}

      {showValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowValidation(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PlaybookValidationPanel playbookId={initialData.playbook.id} versionId={initialData.version.id} refreshKey={validationRefreshKey} />
            <button
              onClick={() => setShowValidation(false)}
              className="mt-3 w-full rounded-lg border border-os-border bg-os-card py-2 text-sm font-semibold text-os-ink hover:bg-os-bg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
