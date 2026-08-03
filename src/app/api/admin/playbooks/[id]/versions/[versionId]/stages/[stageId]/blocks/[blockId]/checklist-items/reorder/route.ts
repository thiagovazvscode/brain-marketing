import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookChecklistItems } from "@/db/schema";
import { loadBlockInStage } from "@/lib/playbook-builder";

// POST, não PATCH — nome exato pedido pra essa rota (diferente do padrão
// PATCH usado no reorder de etapas/blocos da Fase 2.1).
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

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }

    const current = await db
      .select({ id: playbookChecklistItems.id })
      .from(playbookChecklistItems)
      .where(eq(playbookChecklistItems.blockId, blockId));
    const currentIds = new Set(current.map((r) => r.id));
    if (body.orderedIds.length !== currentIds.size || !body.orderedIds.every((itemId) => currentIds.has(itemId))) {
      return NextResponse.json({ error: "A lista não corresponde aos itens deste bloco." }, { status: 400 });
    }

    await Promise.all(
      body.orderedIds.map((itemId, index) =>
        db.update(playbookChecklistItems).set({ position: index }).where(eq(playbookChecklistItems.id, itemId))
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar os itens." }, { status: 500 });
  }
}
