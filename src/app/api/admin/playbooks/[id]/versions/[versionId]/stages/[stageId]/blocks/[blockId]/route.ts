import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookBlockTemplates, resources } from "@/db/schema";
import { loadBlockInStage } from "@/lib/playbook-builder";
import {
  isActivePlaybookBlockType,
  isValidDueOffsetAnchor,
  isValidDurationUnit,
  isValidOverdueAction,
  isValidPlaybookAssigneeRole,
  isValidPlaybookBlockAssigneeType,
  isValidPlaybookBlockPriority,
  isValidPlaybookBlockType,
  sanitizeAnalysisMetadata,
  sanitizeDeliverableMetadata,
  sanitizeDocumentMetadata,
  sanitizeMeetingMetadata,
} from "@/lib/methods";

interface BlockPatchBody {
  type?: string;
  title?: string;
  description?: string;
  internalInstructions?: string;
  assigneeType?: string;
  defaultAssigneeRole?: string | null;
  defaultAssigneeId?: string | null;
  externalResponsibleRole?: string;
  dueOffsetValue?: number | null;
  dueOffsetUnit?: string | null;
  dueOffsetAnchor?: string | null;
  priority?: string;
  isRequired?: boolean;
  blocksStage?: boolean;
  dependencyBlockId?: string | null;
  expectedResult?: string;
  completionCriteria?: string;
  overdueAction?: string | null;
  clientExpectedResponse?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// O frontend sempre manda o objeto metadata inteiro (nunca um delta parcial
// de sub-campo) quando algo muda nele — por isso o PATCH pode substituir
// metadata inteiro sem precisar fazer merge com o valor salvo antes.
async function resolveMetadataPatch(
  type: string,
  raw: Record<string, unknown> | undefined
): Promise<{ metadata: Record<string, unknown> | null } | { error: string } | { skip: true }> {
  if (raw === undefined) return { skip: true };
  if (type === "meeting") {
    const result = sanitizeMeetingMetadata(raw);
    return "error" in result ? result : { metadata: result.metadata };
  }
  if (type === "document") {
    const result = sanitizeDocumentMetadata(raw);
    if ("error" in result) return result;
    if (result.metadata.resourceId) {
      const [resource] = await db.select({ id: resources.id }).from(resources).where(eq(resources.id, result.metadata.resourceId as string)).limit(1);
      if (!resource) return { error: "Recurso vinculado não encontrado." };
    }
    return { metadata: result.metadata };
  }
  if (type === "analysis") {
    const result = sanitizeAnalysisMetadata(raw);
    return "error" in result ? result : { metadata: result.metadata };
  }
  if (type === "deliverable") {
    const result = sanitizeDeliverableMetadata(raw);
    return "error" in result ? result : { metadata: result.metadata };
  }
  return { metadata: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: BlockPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.type !== undefined) {
    if (!isValidPlaybookBlockType(body.type)) return NextResponse.json({ error: "Tipo de bloco inválido." }, { status: 400 });
    if (!isActivePlaybookBlockType(body.type)) {
      return NextResponse.json({ error: "Este tipo de bloco chega em uma próxima entrega." }, { status: 400 });
    }
  }
  if (body.dueOffsetUnit && !isValidDurationUnit(body.dueOffsetUnit)) {
    return NextResponse.json({ error: "Unidade de prazo inválida." }, { status: 400 });
  }
  if (body.dueOffsetAnchor && !isValidDueOffsetAnchor(body.dueOffsetAnchor)) {
    return NextResponse.json({ error: "Referência de prazo inválida." }, { status: 400 });
  }
  if (body.priority && !isValidPlaybookBlockPriority(body.priority)) {
    return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
  }
  if (body.overdueAction && !isValidOverdueAction(body.overdueAction)) {
    return NextResponse.json({ error: "Ação em caso de atraso inválida." }, { status: 400 });
  }
  if (body.assigneeType !== undefined && !isValidPlaybookBlockAssigneeType(body.assigneeType)) {
    return NextResponse.json({ error: "Modalidade de responsável inválida." }, { status: 400 });
  }
  if (body.defaultAssigneeRole && !isValidPlaybookAssigneeRole(body.defaultAssigneeRole)) {
    return NextResponse.json({ error: "Papel padrão inválido." }, { status: 400 });
  }
  if (body.dependencyBlockId === blockId) {
    return NextResponse.json({ error: "Um bloco não pode depender dele mesmo." }, { status: 400 });
  }

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }

    if (body.dependencyBlockId) {
      const [dependency] = await db
        .select({ id: playbookBlockTemplates.id })
        .from(playbookBlockTemplates)
        .where(and(eq(playbookBlockTemplates.id, body.dependencyBlockId), eq(playbookBlockTemplates.stageId, stageId)))
        .limit(1);
      if (!dependency) {
        return NextResponse.json({ error: "Dependência precisa ser um bloco da mesma etapa." }, { status: 400 });
      }
    }

    const metadataResult = await resolveMetadataPatch(body.type ?? chain.block.type, body.metadata);
    if ("error" in metadataResult) return NextResponse.json({ error: metadataResult.error }, { status: 400 });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (!("skip" in metadataResult)) patch.metadata = metadataResult.metadata;
    if (body.type !== undefined) patch.type = body.type;
    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.description !== undefined) patch.description = body.description.trim() || null;
    if (body.internalInstructions !== undefined) patch.internalInstructions = body.internalInstructions.trim() || null;
    if (body.assigneeType !== undefined) patch.assigneeType = body.assigneeType;
    if (body.defaultAssigneeRole !== undefined) patch.defaultAssigneeRole = body.defaultAssigneeRole || null;
    if (body.defaultAssigneeId !== undefined) patch.defaultAssigneeId = body.defaultAssigneeId || null;
    if (body.externalResponsibleRole !== undefined) patch.externalResponsibleRole = body.externalResponsibleRole.trim() || null;
    if (body.dueOffsetValue !== undefined) patch.dueOffsetValue = body.dueOffsetValue;
    if (body.dueOffsetUnit !== undefined) patch.dueOffsetUnit = body.dueOffsetUnit || null;
    if (body.dueOffsetAnchor !== undefined) patch.dueOffsetAnchor = body.dueOffsetAnchor || null;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.blocksStage !== undefined) patch.blocksStage = body.blocksStage;
    if (body.dependencyBlockId !== undefined) patch.dependencyBlockId = body.dependencyBlockId || null;
    if (body.expectedResult !== undefined) patch.expectedResult = body.expectedResult.trim() || null;
    if (body.completionCriteria !== undefined) patch.completionCriteria = body.completionCriteria.trim() || null;
    if (body.overdueAction !== undefined) patch.overdueAction = body.overdueAction || null;
    if (body.clientExpectedResponse !== undefined) patch.clientExpectedResponse = body.clientExpectedResponse.trim() || null;
    if (body.tags !== undefined) patch.tags = body.tags.filter(Boolean);

    const [block] = await db.update(playbookBlockTemplates).set(patch).where(eq(playbookBlockTemplates.id, blockId)).returning();
    return NextResponse.json({ block });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o bloco." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }

    // Nenhum outro bloco pode ficar apontando pra um dependencyBlockId
    // apagado — limpa a referência em vez de deixar FK órfã bloquear o delete.
    await db
      .update(playbookBlockTemplates)
      .set({ dependencyBlockId: null })
      .where(eq(playbookBlockTemplates.dependencyBlockId, blockId));
    await db.delete(playbookBlockTemplates).where(eq(playbookBlockTemplates.id, blockId));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o bloco." }, { status: 500 });
  }
}
