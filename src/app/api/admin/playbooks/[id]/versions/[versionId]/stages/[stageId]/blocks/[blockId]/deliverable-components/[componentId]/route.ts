import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookDeliverableComponents } from "@/db/schema";
import { loadDeliverableComponentInBlock } from "@/lib/playbook-builder";
import {
  MAX_LONG_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidDeliverableComponentFormat,
  isValidDeliverableComponentType,
  isValidPlaybookAssigneeRole,
  isValidPlaybookBlockAssigneeType,
} from "@/lib/methods";

interface ComponentPatchBody {
  title?: string;
  description?: string | null;
  componentType?: string;
  expectedFormat?: string;
  isRequired?: boolean;
  defaultAssigneeType?: string;
  defaultAssigneeRole?: string | null;
  defaultAssigneeId?: string | null;
  acceptanceCriteria?: string | null;
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; componentId: string }> }
) {
  const { id, versionId, stageId, blockId, componentId } = await params;

  let body: ComponentPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "Título do componente é obrigatório." }, { status: 400 });
  }
  if (body.title !== undefined && body.title.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Título do componente muito longo." }, { status: 400 });
  }
  if (typeof body.description === "string" && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição do componente muito longa." }, { status: 400 });
  }
  if (body.componentType !== undefined && !isValidDeliverableComponentType(body.componentType)) {
    return NextResponse.json({ error: "Tipo do componente inválido." }, { status: 400 });
  }
  if (body.expectedFormat !== undefined && !isValidDeliverableComponentFormat(body.expectedFormat)) {
    return NextResponse.json({ error: "Formato esperado inválido." }, { status: 400 });
  }
  if (body.defaultAssigneeType !== undefined && !isValidPlaybookBlockAssigneeType(body.defaultAssigneeType)) {
    return NextResponse.json({ error: "Modalidade de responsável inválida." }, { status: 400 });
  }
  if (typeof body.defaultAssigneeRole === "string" && body.defaultAssigneeRole && !isValidPlaybookAssigneeRole(body.defaultAssigneeRole)) {
    return NextResponse.json({ error: "Papel padrão inválido." }, { status: 400 });
  }
  if (typeof body.acceptanceCriteria === "string" && body.acceptanceCriteria.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Critério de aceite muito longo." }, { status: 400 });
  }

  try {
    const chain = await loadDeliverableComponentInBlock(id, versionId, stageId, blockId, componentId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Componente não encontrado." }, { status: 404 });
    }

    // Mesmo cuidado de tipo aplicado às rotas de Análise (dims/[dimId]/crit/
    // [critId]): nunca chamar .trim()/.length num campo opcional sem
    // confirmar que veio string — "limpar com null" é um caso válido e não
    // pode quebrar a rota.
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.description !== undefined) patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.componentType !== undefined) patch.componentType = body.componentType;
    if (body.expectedFormat !== undefined) patch.expectedFormat = body.expectedFormat;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.defaultAssigneeType !== undefined) patch.defaultAssigneeType = body.defaultAssigneeType;
    if (body.defaultAssigneeRole !== undefined) patch.defaultAssigneeRole = typeof body.defaultAssigneeRole === "string" ? body.defaultAssigneeRole.trim() || null : null;
    if (body.defaultAssigneeId !== undefined) patch.defaultAssigneeId = body.defaultAssigneeId || null;
    if (body.acceptanceCriteria !== undefined) patch.acceptanceCriteria = typeof body.acceptanceCriteria === "string" ? body.acceptanceCriteria.trim() || null : null;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [component] = await db
      .update(playbookDeliverableComponents)
      .set(patch)
      .where(eq(playbookDeliverableComponents.id, componentId))
      .returning();
    return NextResponse.json({ component });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o componente." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; componentId: string }> }
) {
  const { id, versionId, stageId, blockId, componentId } = await params;

  try {
    const chain = await loadDeliverableComponentInBlock(id, versionId, stageId, blockId, componentId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Componente não encontrado." }, { status: 404 });
    }

    await db.delete(playbookDeliverableComponents).where(eq(playbookDeliverableComponents.id, componentId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o componente." }, { status: 500 });
  }
}
