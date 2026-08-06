import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookDeliverableComponents } from "@/db/schema";
import { loadBlockInStage } from "@/lib/playbook-builder";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: { orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: "Lista de IDs inválida." }, { status: 400 });
  }
  if (new Set(body.orderedIds).size !== body.orderedIds.length) {
    return NextResponse.json({ error: "A lista contém IDs duplicados." }, { status: 400 });
  }

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }

    // Mesma validação de pertencimento das rotas de reorder de Análise: a
    // lista recebida precisa corresponder exatamente ao conjunto de
    // componentes deste bloco — nunca aceita lista incompleta nem ID de
    // outro Entregável/bloco (item 12/22 do pedido).
    const current = await db
      .select({ id: playbookDeliverableComponents.id })
      .from(playbookDeliverableComponents)
      .where(eq(playbookDeliverableComponents.blockId, blockId));
    const currentIds = new Set(current.map((r) => r.id));
    if (body.orderedIds.length !== currentIds.size || !body.orderedIds.every((componentId) => currentIds.has(componentId))) {
      return NextResponse.json({ error: "A lista não corresponde aos componentes deste bloco." }, { status: 400 });
    }

    await Promise.all(
      body.orderedIds.map((componentId, index) =>
        db.update(playbookDeliverableComponents).set({ position: index }).where(eq(playbookDeliverableComponents.id, componentId))
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar os componentes." }, { status: 500 });
  }
}
