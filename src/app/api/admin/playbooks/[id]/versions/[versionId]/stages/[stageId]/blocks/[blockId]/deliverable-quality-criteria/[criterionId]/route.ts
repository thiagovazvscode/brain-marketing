import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookDeliverableQualityCriteria } from "@/db/schema";
import { loadDeliverableQualityCriterionInBlock } from "@/lib/playbook-builder";
import { MAX_LONG_TEXT_LENGTH, MAX_SHORT_TEXT_LENGTH } from "@/lib/methods";

interface QualityCriterionPatchBody {
  name?: string;
  description?: string | null;
  isRequired?: boolean;
  weight?: number | null;
  requiresEvidence?: boolean;
  internalGuidance?: string | null;
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; criterionId: string }> }
) {
  const { id, versionId, stageId, blockId, criterionId } = await params;

  let body: QualityCriterionPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Nome do critério é obrigatório." }, { status: 400 });
  }
  if (body.name !== undefined && body.name.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Nome do critério muito longo." }, { status: 400 });
  }
  if (typeof body.description === "string" && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição do critério muito longa." }, { status: 400 });
  }
  if (typeof body.internalGuidance === "string" && body.internalGuidance.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Orientação interna muito longa." }, { status: 400 });
  }
  // weight é nullable, CHECK 0-100 no banco (mesmo padrão de
  // playbookAnalysisCriteria) — validado aqui só pra devolver mensagem
  // clara em vez de erro genérico de constraint.
  if (body.weight !== undefined && body.weight !== null) {
    if (typeof body.weight !== "number" || !Number.isInteger(body.weight) || body.weight < 0 || body.weight > 100) {
      return NextResponse.json({ error: "Peso precisa ser um número inteiro entre 0 e 100." }, { status: 400 });
    }
  }

  try {
    const chain = await loadDeliverableQualityCriterionInBlock(id, versionId, stageId, blockId, criterionId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Critério não encontrado." }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.weight !== undefined) patch.weight = body.weight;
    if (body.requiresEvidence !== undefined) patch.requiresEvidence = body.requiresEvidence;
    if (body.internalGuidance !== undefined) patch.internalGuidance = typeof body.internalGuidance === "string" ? body.internalGuidance.trim() || null : null;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [criterion] = await db
      .update(playbookDeliverableQualityCriteria)
      .set(patch)
      .where(eq(playbookDeliverableQualityCriteria.id, criterionId))
      .returning();
    return NextResponse.json({ criterion });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o critério." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; criterionId: string }> }
) {
  const { id, versionId, stageId, blockId, criterionId } = await params;

  try {
    const chain = await loadDeliverableQualityCriterionInBlock(id, versionId, stageId, blockId, criterionId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Critério não encontrado." }, { status: 404 });
    }

    await db.delete(playbookDeliverableQualityCriteria).where(eq(playbookDeliverableQualityCriteria.id, criterionId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o critério." }, { status: 500 });
  }
}
