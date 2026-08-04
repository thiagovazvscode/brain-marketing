import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookAnalysisDimensions } from "@/db/schema";
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

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }

    const current = await db
      .select({ id: playbookAnalysisDimensions.id })
      .from(playbookAnalysisDimensions)
      .where(eq(playbookAnalysisDimensions.blockId, blockId));
    const currentIds = new Set(current.map((r) => r.id));
    if (body.orderedIds.length !== currentIds.size || !body.orderedIds.every((dimensionId) => currentIds.has(dimensionId))) {
      return NextResponse.json({ error: "A lista não corresponde às dimensões deste bloco." }, { status: 400 });
    }

    await Promise.all(
      body.orderedIds.map((dimensionId, index) =>
        db.update(playbookAnalysisDimensions).set({ position: index }).where(eq(playbookAnalysisDimensions.id, dimensionId))
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar as dimensões." }, { status: 500 });
  }
}
