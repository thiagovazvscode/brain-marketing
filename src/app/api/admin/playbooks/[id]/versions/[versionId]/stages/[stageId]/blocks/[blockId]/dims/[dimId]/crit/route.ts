import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookAnalysisCriteria } from "@/db/schema";
import { loadDimensionInBlock, getNextAnalysisCriterionPosition, countAnalysisCriteria } from "@/lib/playbook-builder";
import {
  MAX_ANALYSIS_CRITERIA_PER_DIMENSION,
  MAX_LONG_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidAnalysisEvaluationType,
  validateAnalysisCriterionOptions,
  validateAnalysisWeight,
} from "@/lib/methods";

interface CriterionBody {
  name: string;
  description?: string;
  evaluationType?: string;
  weight?: number | null;
  isRequired?: boolean;
  requiresEvidence?: boolean;
  evidenceDescription?: string;
  guidance?: string;
  options?: string[];
}

// Posição sempre calculada no servidor (max(position) + 1 dos critérios
// atuais da dimensão) — mesma regra das dimensões e do checklist.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; dimId: string }> }
) {
  const { id, versionId, stageId, blockId, dimId } = await params;

  let body: Partial<CriterionBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome do critério é obrigatório." }, { status: 400 });
  }
  if (body.name.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Nome do critério muito longo." }, { status: 400 });
  }
  if (body.description !== undefined && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição do critério muito longa." }, { status: 400 });
  }
  const evaluationType = body.evaluationType ?? "texto_livre";
  if (!isValidAnalysisEvaluationType(evaluationType)) {
    return NextResponse.json({ error: "Tipo de avaliação inválido." }, { status: 400 });
  }
  const optionsResult = validateAnalysisCriterionOptions(evaluationType, body.options);
  if ("error" in optionsResult) return NextResponse.json({ error: optionsResult.error }, { status: 400 });
  const weightResult = validateAnalysisWeight(body.weight ?? null);
  if ("error" in weightResult) return NextResponse.json({ error: weightResult.error }, { status: 400 });
  if (body.evidenceDescription !== undefined && body.evidenceDescription.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Evidência esperada muito longa." }, { status: 400 });
  }
  if (body.guidance !== undefined && body.guidance.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Orientação interna muito longa." }, { status: 400 });
  }

  try {
    const chain = await loadDimensionInBlock(id, versionId, stageId, blockId, dimId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Dimensão não encontrada." }, { status: 404 });
    }

    const count = await countAnalysisCriteria(dimId);
    if (count >= MAX_ANALYSIS_CRITERIA_PER_DIMENSION) {
      return NextResponse.json({ error: `Limite de ${MAX_ANALYSIS_CRITERIA_PER_DIMENSION} critérios por dimensão atingido.` }, { status: 400 });
    }
    const nextPosition = await getNextAnalysisCriterionPosition(dimId);

    const [criterion] = await db
      .insert(playbookAnalysisCriteria)
      .values({
        dimensionId: dimId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        evaluationType,
        weight: weightResult.weight,
        isRequired: body.isRequired ?? true,
        requiresEvidence: body.requiresEvidence ?? false,
        evidenceDescription: body.evidenceDescription?.trim() || null,
        guidance: body.guidance?.trim() || null,
        options: optionsResult.options,
        position: nextPosition,
      })
      .returning();

    return NextResponse.json({ criterion });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o critério." }, { status: 500 });
  }
}
