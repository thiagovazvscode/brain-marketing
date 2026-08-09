import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookDeliverableMaterials } from "@/db/schema";
import { loadBlockInStage, getNextDeliverableMaterialPosition, countDeliverableMaterials } from "@/lib/playbook-builder";
import {
  MAX_DELIVERABLE_MATERIALS_PER_BLOCK,
  MAX_LONG_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidDeliverableMaterialType,
  isValidDeliverableMaterialOrigin,
} from "@/lib/methods";

interface MaterialBody {
  name: string;
  materialType: string;
  origin: string;
  description?: string;
}

// Cria um material — name/materialType/origin são exigidos explicitamente
// aqui (mesmo raciocínio de title/componentType/expectedFormat em
// deliverable-components): são colunas NOT NULL sem DEFAULT no banco, então
// se a API deixasse passar sem os três o INSERT falharia com erro genérico
// de constraint. Posição sempre calculada no servidor, nunca confia no body.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: Partial<MaterialBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome do material é obrigatório." }, { status: 400 });
  }
  if (body.name.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Nome do material muito longo." }, { status: 400 });
  }
  if (!body.materialType || !isValidDeliverableMaterialType(body.materialType)) {
    return NextResponse.json({ error: "Tipo do material é obrigatório e precisa ser válido." }, { status: 400 });
  }
  if (!body.origin || !isValidDeliverableMaterialOrigin(body.origin)) {
    return NextResponse.json({ error: "Origem do material é obrigatória e precisa ser válida." }, { status: 400 });
  }
  if (body.description !== undefined && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição do material muito longa." }, { status: 400 });
  }

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (chain.block.type !== "deliverable") {
      return NextResponse.json({ error: "Este bloco não é um entregável." }, { status: 400 });
    }

    const count = await countDeliverableMaterials(blockId);
    if (count >= MAX_DELIVERABLE_MATERIALS_PER_BLOCK) {
      return NextResponse.json({ error: `Limite de ${MAX_DELIVERABLE_MATERIALS_PER_BLOCK} materiais por entregável atingido.` }, { status: 400 });
    }
    const nextPosition = await getNextDeliverableMaterialPosition(blockId);

    const [material] = await db
      .insert(playbookDeliverableMaterials)
      .values({
        blockId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        materialType: body.materialType as never,
        origin: body.origin as never,
        position: nextPosition,
        isRequired: true,
        assigneeType: "definir_ao_aplicar",
        requiredMoment: "define_on_apply",
        isActive: true,
      })
      .returning();

    return NextResponse.json({ material });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o material." }, { status: 500 });
  }
}
