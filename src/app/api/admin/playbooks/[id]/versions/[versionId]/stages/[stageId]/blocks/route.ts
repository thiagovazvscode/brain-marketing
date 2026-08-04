import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookBlockTemplates, resources } from "@/db/schema";
import { loadStageInVersion } from "@/lib/playbook-builder";
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
  sanitizeDocumentMetadata,
  sanitizeMeetingMetadata,
} from "@/lib/methods";

interface BlockBody {
  type: string;
  title: string;
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

/** meeting/document guardam config em metadata; outros tipos não usam. */
async function resolveMetadata(type: string, raw: Record<string, unknown> | undefined): Promise<{ metadata: Record<string, unknown> | null } | { error: string }> {
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
  return { metadata: null };
}

function validateFields(body: Partial<BlockBody>): string | null {
  if (body.dueOffsetUnit && !isValidDurationUnit(body.dueOffsetUnit)) return "Unidade de prazo inválida.";
  if (body.dueOffsetAnchor && !isValidDueOffsetAnchor(body.dueOffsetAnchor)) return "Referência de prazo inválida.";
  if (body.priority && !isValidPlaybookBlockPriority(body.priority)) return "Prioridade inválida.";
  if (body.overdueAction && !isValidOverdueAction(body.overdueAction)) return "Ação em caso de atraso inválida.";
  if (body.assigneeType && !isValidPlaybookBlockAssigneeType(body.assigneeType)) return "Modalidade de responsável inválida.";
  if (body.defaultAssigneeRole && !isValidPlaybookAssigneeRole(body.defaultAssigneeRole)) return "Papel padrão inválido.";
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string }> }
) {
  const { id, versionId, stageId } = await params;

  let body: Partial<BlockBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.type || !isValidPlaybookBlockType(body.type)) {
    return NextResponse.json({ error: "Tipo de bloco inválido." }, { status: 400 });
  }
  if (!isActivePlaybookBlockType(body.type)) {
    return NextResponse.json({ error: "Este tipo de bloco chega em uma próxima entrega." }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Título do bloco é obrigatório." }, { status: 400 });
  }
  const fieldError = validateFields(body);
  if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

  const metadataResult = await resolveMetadata(body.type, body.metadata);
  if ("error" in metadataResult) return NextResponse.json({ error: metadataResult.error }, { status: 400 });

  try {
    const chain = await loadStageInVersion(id, versionId, stageId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    if (body.dependencyBlockId) {
      // Dependência precisa pertencer à MESMA etapa (regra do pedido).
      const [dependency] = await db
        .select({ id: playbookBlockTemplates.id })
        .from(playbookBlockTemplates)
        .where(and(eq(playbookBlockTemplates.id, body.dependencyBlockId), eq(playbookBlockTemplates.stageId, stageId)))
        .limit(1);
      if (!dependency) {
        return NextResponse.json({ error: "Dependência precisa ser um bloco da mesma etapa." }, { status: 400 });
      }
    }

    const [last] = await db
      .select({ position: playbookBlockTemplates.position })
      .from(playbookBlockTemplates)
      .where(eq(playbookBlockTemplates.stageId, stageId))
      .orderBy(desc(playbookBlockTemplates.position))
      .limit(1);
    const nextPosition = (last?.position ?? -1) + 1;

    const [block] = await db
      .insert(playbookBlockTemplates)
      .values({
        playbookVersionId: versionId,
        stageId,
        type: body.type as never,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        internalInstructions: body.internalInstructions?.trim() || null,
        position: nextPosition,
        assigneeType: (body.assigneeType as never) ?? "definir_ao_aplicar",
        defaultAssigneeRole: body.defaultAssigneeRole || null,
        defaultAssigneeId: body.defaultAssigneeId || null,
        externalResponsibleRole: body.externalResponsibleRole?.trim() || null,
        dueOffsetValue: body.dueOffsetValue ?? null,
        dueOffsetUnit: (body.dueOffsetUnit as never) ?? null,
        dueOffsetAnchor: body.dueOffsetAnchor || null,
        priority: (body.priority as never) ?? "media",
        isRequired: body.isRequired ?? true,
        blocksStage: body.blocksStage ?? false,
        dependencyBlockId: body.dependencyBlockId || null,
        expectedResult: body.expectedResult?.trim() || null,
        completionCriteria: body.completionCriteria?.trim() || null,
        overdueAction: body.overdueAction || null,
        clientExpectedResponse: body.clientExpectedResponse?.trim() || null,
        metadata: metadataResult.metadata,
        tags: body.tags?.filter(Boolean) ?? [],
      })
      .returning();

    return NextResponse.json({ block });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o bloco." }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  const blocks = await db
    .select()
    .from(playbookBlockTemplates)
    .where(eq(playbookBlockTemplates.stageId, stageId))
    .orderBy(asc(playbookBlockTemplates.position));
  return NextResponse.json({ blocks });
}
