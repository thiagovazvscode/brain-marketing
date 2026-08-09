import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookDeliverableComponents, playbookDeliverableMaterials, resources } from "@/db/schema";
import { loadDeliverableMaterialInBlock } from "@/lib/playbook-builder";
import {
  MAX_LONG_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidDeliverableMaterialType,
  isValidDeliverableMaterialOrigin,
  isValidDeliverableMaterialMoment,
  isValidPlaybookAssigneeRole,
  isValidPlaybookBlockAssigneeType,
} from "@/lib/methods";

interface MaterialPatchBody {
  name?: string;
  description?: string | null;
  materialType?: string;
  origin?: string;
  isRequired?: boolean;
  assigneeType?: string;
  assigneeRole?: string | null;
  assigneeId?: string | null;
  requiredMoment?: string;
  beforeComponentId?: string | null;
  url?: string | null;
  resourceId?: string | null;
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; materialId: string }> }
) {
  const { id, versionId, stageId, blockId, materialId } = await params;

  let body: MaterialPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Nome do material é obrigatório." }, { status: 400 });
  }
  if (body.name !== undefined && body.name.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Nome do material muito longo." }, { status: 400 });
  }
  if (typeof body.description === "string" && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição do material muito longa." }, { status: 400 });
  }
  if (body.materialType !== undefined && !isValidDeliverableMaterialType(body.materialType)) {
    return NextResponse.json({ error: "Tipo do material inválido." }, { status: 400 });
  }
  if (body.origin !== undefined && !isValidDeliverableMaterialOrigin(body.origin)) {
    return NextResponse.json({ error: "Origem do material inválida." }, { status: 400 });
  }
  if (body.assigneeType !== undefined && !isValidPlaybookBlockAssigneeType(body.assigneeType)) {
    return NextResponse.json({ error: "Modalidade de responsável inválida." }, { status: 400 });
  }
  if (typeof body.assigneeRole === "string" && body.assigneeRole && !isValidPlaybookAssigneeRole(body.assigneeRole)) {
    return NextResponse.json({ error: "Papel do responsável inválido." }, { status: 400 });
  }
  if (body.requiredMoment !== undefined && !isValidDeliverableMaterialMoment(body.requiredMoment)) {
    return NextResponse.json({ error: "Momento necessário inválido." }, { status: 400 });
  }
  if (typeof body.url === "string" && body.url.length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "URL ou referência muito longa." }, { status: 400 });
  }

  try {
    const chain = await loadDeliverableMaterialInBlock(id, versionId, stageId, blockId, materialId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    // beforeComponentId só faz sentido dentro do MESMO bloco — nunca aceita
    // referência a componente de outro Entregável/bloco (item 6 do pedido).
    if (typeof body.beforeComponentId === "string" && body.beforeComponentId) {
      const [component] = await db
        .select({ id: playbookDeliverableComponents.id })
        .from(playbookDeliverableComponents)
        .where(and(eq(playbookDeliverableComponents.id, body.beforeComponentId), eq(playbookDeliverableComponents.blockId, blockId)))
        .limit(1);
      if (!component) {
        return NextResponse.json({ error: "Componente relacionado precisa pertencer ao mesmo entregável." }, { status: 400 });
      }
    }

    if (typeof body.resourceId === "string" && body.resourceId) {
      const [resource] = await db.select({ id: resources.id }).from(resources).where(eq(resources.id, body.resourceId)).limit(1);
      if (!resource) {
        return NextResponse.json({ error: "Recurso vinculado não encontrado." }, { status: 400 });
      }
    }

    // Mesmo cuidado de tipo das rotas de componente/análise: nunca chamar
    // .trim() num campo opcional sem confirmar que veio string — "limpar
    // com null" é um caso válido de autosave e não pode quebrar a rota.
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.materialType !== undefined) patch.materialType = body.materialType;
    if (body.origin !== undefined) patch.origin = body.origin;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.assigneeType !== undefined) patch.assigneeType = body.assigneeType;
    if (body.assigneeRole !== undefined) patch.assigneeRole = typeof body.assigneeRole === "string" ? body.assigneeRole.trim() || null : null;
    if (body.assigneeId !== undefined) patch.assigneeId = body.assigneeId || null;
    if (body.requiredMoment !== undefined) patch.requiredMoment = body.requiredMoment;
    if (body.beforeComponentId !== undefined) patch.beforeComponentId = body.beforeComponentId || null;
    if (body.url !== undefined) patch.url = typeof body.url === "string" ? body.url.trim() || null : null;
    if (body.resourceId !== undefined) patch.resourceId = body.resourceId || null;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [material] = await db
      .update(playbookDeliverableMaterials)
      .set(patch)
      .where(eq(playbookDeliverableMaterials.id, materialId))
      .returning();
    return NextResponse.json({ material });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o material." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; materialId: string }> }
) {
  const { id, versionId, stageId, blockId, materialId } = await params;

  try {
    const chain = await loadDeliverableMaterialInBlock(id, versionId, stageId, blockId, materialId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    await db.delete(playbookDeliverableMaterials).where(eq(playbookDeliverableMaterials.id, materialId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o material." }, { status: 500 });
  }
}
