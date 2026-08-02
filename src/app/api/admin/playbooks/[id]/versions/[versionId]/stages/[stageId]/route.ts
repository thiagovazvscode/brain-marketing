import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookStageTemplates, playbookBlockTemplates } from "@/db/schema";
import { loadStageInVersion } from "@/lib/playbook-builder";
import { isValidDurationUnit, isValidPlaybookBlockPriority } from "@/lib/methods";

interface StagePatchBody {
  name?: string;
  objective?: string;
  description?: string;
  internalInstructions?: string;
  durationValue?: number | null;
  durationUnit?: string | null;
  defaultAssigneeRole?: string;
  isRequired?: boolean;
  blocksNextStage?: boolean;
  completionCriteria?: string;
  expectedDeliverable?: string;
  priority?: string;
  tags?: string[];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string }> }
) {
  const { id, versionId, stageId } = await params;

  let body: StagePatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (body.durationUnit && !isValidDurationUnit(body.durationUnit)) {
    return NextResponse.json({ error: "Unidade de duração inválida." }, { status: 400 });
  }
  if (body.priority && !isValidPlaybookBlockPriority(body.priority)) {
    return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
  }

  try {
    const chain = await loadStageInVersion(id, versionId, stageId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.objective !== undefined) patch.objective = body.objective.trim();
    if (body.description !== undefined) patch.description = body.description.trim() || null;
    if (body.internalInstructions !== undefined) patch.internalInstructions = body.internalInstructions.trim() || null;
    if (body.durationValue !== undefined) patch.durationValue = body.durationValue;
    if (body.durationUnit !== undefined) patch.durationUnit = body.durationUnit || null;
    if (body.defaultAssigneeRole !== undefined) patch.defaultAssigneeRole = body.defaultAssigneeRole.trim() || null;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.blocksNextStage !== undefined) patch.blocksNextStage = body.blocksNextStage;
    if (body.completionCriteria !== undefined) patch.completionCriteria = body.completionCriteria.trim() || null;
    if (body.expectedDeliverable !== undefined) patch.expectedDeliverable = body.expectedDeliverable.trim() || null;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.tags !== undefined) patch.tags = body.tags.filter(Boolean);

    const [stage] = await db
      .update(playbookStageTemplates)
      .set(patch)
      .where(eq(playbookStageTemplates.id, stageId))
      .returning();

    return NextResponse.json({ stage });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a etapa." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string }> }
) {
  const { id, versionId, stageId } = await params;

  try {
    const chain = await loadStageInVersion(id, versionId, stageId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }
    // Sem cascade no banco (drizzle não gera ON DELETE aqui) — apaga os
    // blocos filhos primeiro, depois a etapa. Afeta só o rascunho: a etapa
    // pertence a esta versão, nunca à publicada.
    await db.delete(playbookBlockTemplates).where(eq(playbookBlockTemplates.stageId, stageId));
    await db.delete(playbookStageTemplates).where(eq(playbookStageTemplates.id, stageId));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a etapa." }, { status: 500 });
  }
}
