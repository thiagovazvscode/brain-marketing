import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookDeliverableQualityCriteria } from "@/db/schema";
import { loadBlockInStage, getNextDeliverableQualityCriterionPosition, countDeliverableQualityCriteria } from "@/lib/playbook-builder";
import { MAX_DELIVERABLE_QUALITY_CRITERIA_PER_BLOCK, MAX_LONG_TEXT_LENGTH, MAX_SHORT_TEXT_LENGTH } from "@/lib/methods";

interface QualityCriterionBody {
  name: string;
  description?: string;
}

// Cria um critério de qualidade — name é a única coluna NOT NULL sem
// DEFAULT (mesmo raciocínio de deliverable-components/deliverable-materials).
// Posição sempre calculada no servidor, nunca confia no body.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: Partial<QualityCriterionBody>;
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

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (chain.block.type !== "deliverable") {
      return NextResponse.json({ error: "Este bloco não é um entregável." }, { status: 400 });
    }

    const count = await countDeliverableQualityCriteria(blockId);
    if (count >= MAX_DELIVERABLE_QUALITY_CRITERIA_PER_BLOCK) {
      return NextResponse.json({ error: `Limite de ${MAX_DELIVERABLE_QUALITY_CRITERIA_PER_BLOCK} critérios por entregável atingido.` }, { status: 400 });
    }
    const nextPosition = await getNextDeliverableQualityCriterionPosition(blockId);

    const [criterion] = await db
      .insert(playbookDeliverableQualityCriteria)
      .values({
        blockId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        position: nextPosition,
        isRequired: true,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ criterion });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o critério." }, { status: 500 });
  }
}
