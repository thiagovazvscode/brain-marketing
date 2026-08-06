import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookDeliverableComponents } from "@/db/schema";
import { loadBlockInStage, getNextDeliverableComponentPosition, countDeliverableComponents } from "@/lib/playbook-builder";
import {
  MAX_DELIVERABLE_COMPONENTS_PER_BLOCK,
  MAX_LONG_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidDeliverableComponentFormat,
  isValidDeliverableComponentType,
} from "@/lib/methods";

interface ComponentBody {
  title: string;
  componentType: string;
  expectedFormat: string;
  description?: string;
}

// Cria um componente — title/componentType/expectedFormat são exigidos
// explicitamente aqui (item 6 do pedido da Fase 2.2B.2A): as duas colunas
// são NOT NULL sem DEFAULT no banco de propósito (correção pós-gate), então
// se a API deixasse passar sem os dois o INSERT falharia com erro genérico
// de constraint — melhor rejeitar cedo com mensagem clara. Posição sempre
// calculada no servidor (mesma regra de Análise), nunca confia no body.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: Partial<ComponentBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Título do componente é obrigatório." }, { status: 400 });
  }
  if (body.title.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Título do componente muito longo." }, { status: 400 });
  }
  if (!body.componentType || !isValidDeliverableComponentType(body.componentType)) {
    return NextResponse.json({ error: "Tipo do componente é obrigatório e precisa ser válido." }, { status: 400 });
  }
  if (!body.expectedFormat || !isValidDeliverableComponentFormat(body.expectedFormat)) {
    return NextResponse.json({ error: "Formato esperado é obrigatório e precisa ser válido." }, { status: 400 });
  }
  if (body.description !== undefined && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição do componente muito longa." }, { status: 400 });
  }

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (chain.block.type !== "deliverable") {
      return NextResponse.json({ error: "Este bloco não é um entregável." }, { status: 400 });
    }

    const count = await countDeliverableComponents(blockId);
    if (count >= MAX_DELIVERABLE_COMPONENTS_PER_BLOCK) {
      return NextResponse.json({ error: `Limite de ${MAX_DELIVERABLE_COMPONENTS_PER_BLOCK} componentes por entregável atingido.` }, { status: 400 });
    }
    const nextPosition = await getNextDeliverableComponentPosition(blockId);

    const [component] = await db
      .insert(playbookDeliverableComponents)
      .values({
        blockId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        componentType: body.componentType as never,
        expectedFormat: body.expectedFormat as never,
        position: nextPosition,
        isRequired: true,
        defaultAssigneeType: "definir_ao_aplicar",
        isActive: true,
      })
      .returning();

    return NextResponse.json({ component });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o componente." }, { status: 500 });
  }
}
