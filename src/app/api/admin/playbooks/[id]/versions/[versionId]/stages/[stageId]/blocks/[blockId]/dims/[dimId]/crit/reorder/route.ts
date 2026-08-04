import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookAnalysisCriteria } from "@/db/schema";
import { loadDimensionInBlock } from "@/lib/playbook-builder";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; dimId: string }> }
) {
  const { id, versionId, stageId, blockId, dimId } = await params;

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
    const chain = await loadDimensionInBlock(id, versionId, stageId, blockId, dimId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Dimensão não encontrada." }, { status: 404 });
    }

    const current = await db
      .select({ id: playbookAnalysisCriteria.id })
      .from(playbookAnalysisCriteria)
      .where(eq(playbookAnalysisCriteria.dimensionId, dimId));
    const currentIds = new Set(current.map((r) => r.id));
    if (body.orderedIds.length !== currentIds.size || !body.orderedIds.every((critId) => currentIds.has(critId))) {
      return NextResponse.json({ error: "A lista não corresponde aos critérios desta dimensão." }, { status: 400 });
    }

    await Promise.all(
      body.orderedIds.map((critId, index) =>
        db.update(playbookAnalysisCriteria).set({ position: index }).where(eq(playbookAnalysisCriteria.id, critId))
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar os critérios." }, { status: 500 });
  }
}
