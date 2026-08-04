import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookAnalysisDimensions } from "@/db/schema";
import { loadBlockInStage, getNextAnalysisDimensionPosition, countAnalysisDimensions } from "@/lib/playbook-builder";
import { MAX_ANALYSIS_DIMENSIONS_PER_BLOCK, MAX_LONG_TEXT_LENGTH, MAX_SHORT_TEXT_LENGTH, validateAnalysisWeight } from "@/lib/methods";

interface DimensionBody {
  name: string;
  description?: string;
  weight?: number | null;
}

// Cria uma dimensão — posição sempre calculada no servidor (max(position) + 1
// das dimensões atuais do bloco), nunca confia no DEFAULT 0 da coluna nem em
// nenhum valor vindo do body (item 4 do pedido, mesma regra do checklist).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: Partial<DimensionBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome da dimensão é obrigatório." }, { status: 400 });
  }
  if (body.name.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Nome da dimensão muito longo." }, { status: 400 });
  }
  if (body.description !== undefined && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição da dimensão muito longa." }, { status: 400 });
  }
  const weightResult = validateAnalysisWeight(body.weight ?? null);
  if ("error" in weightResult) return NextResponse.json({ error: weightResult.error }, { status: 400 });

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (chain.block.type !== "analysis") {
      return NextResponse.json({ error: "Este bloco não é uma análise." }, { status: 400 });
    }

    const count = await countAnalysisDimensions(blockId);
    if (count >= MAX_ANALYSIS_DIMENSIONS_PER_BLOCK) {
      return NextResponse.json({ error: `Limite de ${MAX_ANALYSIS_DIMENSIONS_PER_BLOCK} dimensões por análise atingido.` }, { status: 400 });
    }
    const nextPosition = await getNextAnalysisDimensionPosition(blockId);

    const [dimension] = await db
      .insert(playbookAnalysisDimensions)
      .values({
        blockId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        weight: weightResult.weight,
        position: nextPosition,
      })
      .returning();

    return NextResponse.json({ dimension: { ...dimension, criteria: [] } });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a dimensão." }, { status: 500 });
  }
}
