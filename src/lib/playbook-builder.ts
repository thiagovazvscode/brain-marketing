// Helpers server-only da Fase 2.1 (construtor visual de playbooks).
//
// Separado de src/lib/methods.ts de propósito: methods.ts é importado por
// componentes client (StatusBadge, PlaybookForm...) e não pode puxar "@/db"
// pro bundle do navegador. Tudo aqui só roda dentro de route handlers e do
// Server Component da página do editor.

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  playbooks,
  playbookVersions,
  playbookStageTemplates,
  playbookBlockTemplates,
  playbookChecklistItems,
  playbookFormQuestions,
} from "@/db/schema";
import { bumpVersion, computeVersionTransition } from "@/lib/methods";

/**
 * Copia etapas + blocos de uma versão pra outra, com IDs novos — regra do
 * pedido: "criar uma cópia da versão publicada como nova versão em
 * rascunho" (não abrir a versão nova em branco). Dependência entre blocos é
 * remapeada pro par novo (dependência só existe dentro da mesma etapa, e a
 * etapa inteira é copiada junto).
 */
async function cloneStagesAndBlocks(sourceVersionId: string, targetVersionId: string) {
  const stages = await getStagesWithBlocks(sourceVersionId);
  if (stages.length === 0) return;

  for (const stage of stages) {
    const [newStage] = await db
      .insert(playbookStageTemplates)
      .values({
        playbookVersionId: targetVersionId,
        name: stage.name,
        objective: stage.objective,
        description: stage.description,
        internalInstructions: stage.internalInstructions,
        position: stage.position,
        durationValue: stage.durationValue,
        durationUnit: stage.durationUnit,
        defaultAssigneeRole: stage.defaultAssigneeRole,
        isRequired: stage.isRequired,
        blocksNextStage: stage.blocksNextStage,
        completionCriteria: stage.completionCriteria,
        expectedDeliverable: stage.expectedDeliverable,
        priority: stage.priority,
        tags: stage.tags,
      })
      .returning();

    if (stage.blocks.length === 0) continue;

    const blockIdMap = new Map<string, string>();
    for (const block of stage.blocks) {
      const [newBlock] = await db
        .insert(playbookBlockTemplates)
        .values({
          playbookVersionId: targetVersionId,
          stageId: newStage.id,
          type: block.type,
          title: block.title,
          description: block.description,
          internalInstructions: block.internalInstructions,
          position: block.position,
          assigneeType: block.assigneeType,
          defaultAssigneeRole: block.defaultAssigneeRole,
          defaultAssigneeId: block.defaultAssigneeId,
          externalResponsibleRole: block.externalResponsibleRole,
          dueOffsetValue: block.dueOffsetValue,
          dueOffsetUnit: block.dueOffsetUnit,
          dueOffsetAnchor: block.dueOffsetAnchor,
          priority: block.priority,
          isRequired: block.isRequired,
          blocksStage: block.blocksStage,
          dependencyBlockId: null,
          expectedResult: block.expectedResult,
          completionCriteria: block.completionCriteria,
          overdueAction: block.overdueAction,
          clientExpectedResponse: block.clientExpectedResponse,
          metadata: block.metadata,
          tags: block.tags,
        })
        .returning();
      blockIdMap.set(block.id, newBlock.id);

      // Itens de checklist / perguntas de formulário são filhos do bloco —
      // clonam junto, com IDs novos, nunca compartilhados entre versões
      // (regra do pedido).
      if (block.checklistItems.length > 0) {
        await db.insert(playbookChecklistItems).values(
          block.checklistItems.map((item) => ({
            blockId: newBlock.id,
            title: item.title,
            description: item.description,
            groupName: item.groupName,
            position: item.position,
            isRequired: item.isRequired,
            requiresEvidence: item.requiresEvidence,
            allowsNotes: item.allowsNotes,
            isActive: item.isActive,
          }))
        );
      }
      if (block.formQuestions.length > 0) {
        await db.insert(playbookFormQuestions).values(
          block.formQuestions.map((q) => ({
            blockId: newBlock.id,
            label: q.label,
            helpText: q.helpText,
            questionType: q.questionType,
            placeholder: q.placeholder,
            options: q.options,
            validation: q.validation,
            sectionName: q.sectionName,
            position: q.position,
            isRequired: q.isRequired,
          }))
        );
      }
    }

    await Promise.all(
      stage.blocks
        .filter((b) => b.dependencyBlockId && blockIdMap.has(b.dependencyBlockId))
        .map((b) =>
          db
            .update(playbookBlockTemplates)
            .set({ dependencyBlockId: blockIdMap.get(b.dependencyBlockId!) })
            .where(eq(playbookBlockTemplates.id, blockIdMap.get(b.id)!))
        )
    );
  }
}

/**
 * Garante que existe uma linha de playbookVersions endereçável para o
 * estado que o construtor está editando agora, e retorna (playbook, versão).
 *
 * - status "rascunho" com currentVersionId apontando pra uma linha
 *   "rascunho" válida → reaproveita, nada é escrito.
 * - status "rascunho" sem essa linha (drafts abertos antes desta coluna
 *   existir, ou nunca abertos no construtor) → cria agora com o snapshot
 *   atual do playbook, sem mudar status/version (já estava em rascunho).
 * - status "publicado" → aplica computeVersionTransition (mesma regra do
 *   PATCH de metadados): cria a PRÓXIMA versão como rascunho, nunca toca a
 *   linha já publicada.
 *
 * Nunca dá update numa linha com status "publicado" já gravada — só cria
 * linha nova ou reaproveita uma que já é rascunho.
 */
export async function ensureDraftVersion(playbookId: string) {
  const [playbook] = await db.select().from(playbooks).where(eq(playbooks.id, playbookId)).limit(1);
  if (!playbook) return null;

  if (playbook.status === "rascunho" && playbook.currentVersionId) {
    const [current] = await db
      .select()
      .from(playbookVersions)
      .where(and(eq(playbookVersions.id, playbook.currentVersionId), eq(playbookVersions.playbookId, playbookId)))
      .limit(1);
    if (current && current.status === "rascunho") {
      return { playbook, version: current };
    }
  }

  if (playbook.status === "rascunho") {
    const [version] = await db
      .insert(playbookVersions)
      .values({
        playbookId,
        versionLabel: playbook.version,
        status: "rascunho",
        snapshot: playbook,
        authorId: playbook.authorId,
      })
      .returning();
    const [updated] = await db
      .update(playbooks)
      .set({ currentVersionId: version.id })
      .where(eq(playbooks.id, playbookId))
      .returning();
    return { playbook: updated, version };
  }

  // publicado (ou arquivado — mesma transição: abre um novo rascunho pra editar).
  const transition = computeVersionTransition(playbook.status, playbook.version) ?? {
    nextStatus: "rascunho" as const,
    nextVersion: bumpVersion(playbook.version),
  };

  const [version] = await db
    .insert(playbookVersions)
    .values({
      playbookId,
      versionLabel: transition.nextVersion,
      status: "rascunho",
      snapshot: playbook,
      authorId: playbook.authorId,
    })
    .returning();

  // Copia a estrutura da versão publicada pro rascunho novo — regra do
  // pedido: "criar uma cópia da versão publicada", não abrir em branco.
  if (playbook.currentVersionId) {
    await cloneStagesAndBlocks(playbook.currentVersionId, version.id);
  }

  const [updated] = await db
    .update(playbooks)
    .set({ status: transition.nextStatus, version: transition.nextVersion, currentVersionId: version.id, updatedAt: new Date() })
    .where(eq(playbooks.id, playbookId))
    .returning();

  return { playbook: updated, version };
}

/**
 * Versão somente-leitura de ensureDraftVersion — nunca grava nada. Usada
 * pela renderização do editor (GET / Server Component), que não pode ter
 * efeito colateral no banco. Retorna `version: null` quando o playbook está
 * publicado (ou arquivado) e não tem rascunho aberto ainda: nesse caso quem
 * chama deve mostrar a tela de confirmação, não criar nada sozinho.
 */
export async function getEditableVersion(playbookId: string) {
  const [playbook] = await db.select().from(playbooks).where(eq(playbooks.id, playbookId)).limit(1);
  if (!playbook) return null;

  if (playbook.currentVersionId) {
    const [current] = await db
      .select()
      .from(playbookVersions)
      .where(and(eq(playbookVersions.id, playbook.currentVersionId), eq(playbookVersions.playbookId, playbookId)))
      .limit(1);
    if (current && current.status === "rascunho") {
      return { playbook, version: current };
    }
  }

  return { playbook, version: null };
}

/**
 * Valida que a versão pertence ao playbook E está em rascunho — toda
 * escrita de etapa/bloco só vale para a versão em edição (regra do pedido:
 * "todas as alterações do construtor devem pertencer à versão em
 * rascunho"). Versão publicada/arquivada não aceita escrita aqui.
 */
export async function assertDraftVersion(playbookId: string, versionId: string) {
  const [version] = await db
    .select()
    .from(playbookVersions)
    .where(and(eq(playbookVersions.id, versionId), eq(playbookVersions.playbookId, playbookId)))
    .limit(1);
  if (!version || version.status !== "rascunho") return null;
  return version;
}

/**
 * Valida a cadeia playbook → versão → etapa (nunca altera por stageId
 * isolado). Retorna null se qualquer elo não bater — as rotas devolvem 404
 * genérico nesse caso, sem revelar se o playbook/versão existe.
 */
export async function loadStageInVersion(playbookId: string, versionId: string, stageId: string) {
  const [version] = await db
    .select()
    .from(playbookVersions)
    .where(and(eq(playbookVersions.id, versionId), eq(playbookVersions.playbookId, playbookId)))
    .limit(1);
  if (!version) return null;

  const [stage] = await db
    .select()
    .from(playbookStageTemplates)
    .where(and(eq(playbookStageTemplates.id, stageId), eq(playbookStageTemplates.playbookVersionId, versionId)))
    .limit(1);
  if (!stage) return null;

  return { version, stage };
}

/** Mesma lógica de loadStageInVersion, uma camada abaixo (bloco pertence à etapa certa). */
export async function loadBlockInStage(playbookId: string, versionId: string, stageId: string, blockId: string) {
  const chain = await loadStageInVersion(playbookId, versionId, stageId);
  if (!chain) return null;

  const [block] = await db
    .select()
    .from(playbookBlockTemplates)
    .where(and(eq(playbookBlockTemplates.id, blockId), eq(playbookBlockTemplates.stageId, stageId)))
    .limit(1);
  if (!block) return null;

  return { ...chain, block };
}

/**
 * Todas as etapas de uma versão, com seus blocos (e, para Checklist/
 * Formulário, os itens/perguntas filhas já carregados) — usado pelo payload
 * do editor e pela duplicação. Um único round-trip pros filhos: busca por
 * blockId IN (...) em vez de N+1 por bloco.
 */
export async function getStagesWithBlocks(versionId: string) {
  const [stages, blocks] = await Promise.all([
    db
      .select()
      .from(playbookStageTemplates)
      .where(eq(playbookStageTemplates.playbookVersionId, versionId))
      .orderBy(asc(playbookStageTemplates.position)),
    db
      .select()
      .from(playbookBlockTemplates)
      .where(eq(playbookBlockTemplates.playbookVersionId, versionId))
      .orderBy(asc(playbookBlockTemplates.position)),
  ]);

  const blockIds = blocks.map((b) => b.id);
  const [checklistItems, formQuestions] =
    blockIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select()
            .from(playbookChecklistItems)
            .where(inArray(playbookChecklistItems.blockId, blockIds))
            .orderBy(asc(playbookChecklistItems.position)),
          db
            .select()
            .from(playbookFormQuestions)
            .where(inArray(playbookFormQuestions.blockId, blockIds))
            .orderBy(asc(playbookFormQuestions.position)),
        ]);

  const itemsByBlock = new Map<string, typeof checklistItems>();
  for (const item of checklistItems) {
    const list = itemsByBlock.get(item.blockId) ?? [];
    list.push(item);
    itemsByBlock.set(item.blockId, list);
  }
  const questionsByBlock = new Map<string, typeof formQuestions>();
  for (const question of formQuestions) {
    const list = questionsByBlock.get(question.blockId) ?? [];
    list.push(question);
    questionsByBlock.set(question.blockId, list);
  }

  const blocksByStage = new Map<string, (typeof blocks[number] & { checklistItems: typeof checklistItems; formQuestions: typeof formQuestions })[]>();
  for (const block of blocks) {
    const list = blocksByStage.get(block.stageId) ?? [];
    list.push({
      ...block,
      checklistItems: itemsByBlock.get(block.id) ?? [],
      formQuestions: questionsByBlock.get(block.id) ?? [],
    });
    blocksByStage.set(block.stageId, list);
  }

  return stages.map((stage) => ({ ...stage, blocks: blocksByStage.get(stage.id) ?? [] }));
}

/** Mesma cadeia de loadBlockInStage, uma camada abaixo (item pertence ao bloco certo). */
export async function loadChecklistItemInBlock(
  playbookId: string,
  versionId: string,
  stageId: string,
  blockId: string,
  itemId: string
) {
  const chain = await loadBlockInStage(playbookId, versionId, stageId, blockId);
  if (!chain) return null;

  const [item] = await db
    .select()
    .from(playbookChecklistItems)
    .where(and(eq(playbookChecklistItems.id, itemId), eq(playbookChecklistItems.blockId, blockId)))
    .limit(1);
  if (!item) return null;

  return { ...chain, item };
}

/** Mesma cadeia, pra pergunta de formulário. */
export async function loadFormQuestionInBlock(
  playbookId: string,
  versionId: string,
  stageId: string,
  blockId: string,
  questionId: string
) {
  const chain = await loadBlockInStage(playbookId, versionId, stageId, blockId);
  if (!chain) return null;

  const [question] = await db
    .select()
    .from(playbookFormQuestions)
    .where(and(eq(playbookFormQuestions.id, questionId), eq(playbookFormQuestions.blockId, blockId)))
    .limit(1);
  if (!question) return null;

  return { ...chain, question };
}
