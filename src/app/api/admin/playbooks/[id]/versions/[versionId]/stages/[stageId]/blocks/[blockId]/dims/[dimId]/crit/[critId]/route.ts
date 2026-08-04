import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookAnalysisCriteria } from "@/db/schema";
import { loadCriterionInDimension } from "@/lib/playbook-builder";
import {
  MAX_LONG_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidAnalysisEvaluationType,
  validateAnalysisCriterionOptions,
  validateAnalysisWeight,
} from "@/lib/methods";

interface CriterionPatchBody {
  name?: string;
  description?: string;
  evaluationType?: string;
  weight?: number | null;
  isRequired?: boolean;
  requiresEvidence?: boolean;
  evidenceDescription?: string;
  guidance?: string;
  options?: string[];
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; dimId: string; critId: string }> }
) {
  const { id, versionId, stageId, blockId, dimId, critId } = await params;

  let body: CriterionPatchBody;
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
  if (body.evaluationType !== undefined && !isValidAnalysisEvaluationType(body.evaluationType)) {
    return NextResponse.json({ error: "Tipo de avaliação inválido." }, { status: 400 });
  }
  if (typeof body.evidenceDescription === "string" && body.evidenceDescription.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Evidência esperada muito longa." }, { status: 400 });
  }
  if (typeof body.guidance === "string" && body.guidance.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Orientação interna muito longa." }, { status: 400 });
  }
  let sanitizedWeight: number | null | undefined;
  if (body.weight !== undefined) {
    const weightResult = validateAnalysisWeight(body.weight);
    if ("error" in weightResult) return NextResponse.json({ error: weightResult.error }, { status: 400 });
    sanitizedWeight = weightResult.weight;
  }

  try {
    const chain = await loadCriterionInDimension(id, versionId, stageId, blockId, dimId, critId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Critério não encontrado." }, { status: 404 });
    }

    // Tipo efetivo pra validar options é o novo, se veio no patch, senão o já
    // salvo — mesma regra do fix aplicado às perguntas do Formulário/Briefing
    // (enviar tipo e opções juntos no mesmo PATCH).
    const effectiveType = body.evaluationType ?? chain.criterion.evaluationType;
    let sanitizedOptions: string[] | undefined;
    if (body.options !== undefined || body.evaluationType !== undefined) {
      const result = validateAnalysisCriterionOptions(effectiveType, body.options ?? chain.criterion.options);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      sanitizedOptions = result.options;
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.evaluationType !== undefined) patch.evaluationType = body.evaluationType;
    if (sanitizedOptions !== undefined) patch.options = sanitizedOptions;
    if (sanitizedWeight !== undefined) patch.weight = sanitizedWeight;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.requiresEvidence !== undefined) patch.requiresEvidence = body.requiresEvidence;
    if (body.evidenceDescription !== undefined) patch.evidenceDescription = typeof body.evidenceDescription === "string" ? body.evidenceDescription.trim() || null : null;
    if (body.guidance !== undefined) patch.guidance = typeof body.guidance === "string" ? body.guidance.trim() || null : null;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [criterion] = await db
      .update(playbookAnalysisCriteria)
      .set(patch)
      .where(eq(playbookAnalysisCriteria.id, critId))
      .returning();
    return NextResponse.json({ criterion });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o critério." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; dimId: string; critId: string }> }
) {
  const { id, versionId, stageId, blockId, dimId, critId } = await params;

  try {
    const chain = await loadCriterionInDimension(id, versionId, stageId, blockId, dimId, critId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Critério não encontrado." }, { status: 404 });
    }

    await db.delete(playbookAnalysisCriteria).where(eq(playbookAnalysisCriteria.id, critId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o critério." }, { status: 500 });
  }
}
