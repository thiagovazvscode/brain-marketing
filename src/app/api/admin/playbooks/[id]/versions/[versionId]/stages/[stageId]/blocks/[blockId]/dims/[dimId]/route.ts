import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookAnalysisDimensions } from "@/db/schema";
import { loadDimensionInBlock } from "@/lib/playbook-builder";
import { MAX_LONG_TEXT_LENGTH, MAX_SHORT_TEXT_LENGTH, validateAnalysisWeight } from "@/lib/methods";

interface DimensionPatchBody {
  name?: string;
  description?: string;
  weight?: number | null;
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; dimId: string }> }
) {
  const { id, versionId, stageId, blockId, dimId } = await params;

  let body: DimensionPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Nome da dimensão é obrigatório." }, { status: 400 });
  }
  if (body.name !== undefined && body.name.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Nome da dimensão muito longo." }, { status: 400 });
  }
  if (typeof body.description === "string" && body.description.length > MAX_LONG_TEXT_LENGTH) {
    return NextResponse.json({ error: "Descrição da dimensão muito longa." }, { status: 400 });
  }
  let sanitizedWeight: number | null | undefined;
  if (body.weight !== undefined) {
    const weightResult = validateAnalysisWeight(body.weight);
    if ("error" in weightResult) return NextResponse.json({ error: weightResult.error }, { status: 400 });
    sanitizedWeight = weightResult.weight;
  }

  try {
    const chain = await loadDimensionInBlock(id, versionId, stageId, blockId, dimId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Dimensão não encontrada." }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (sanitizedWeight !== undefined) patch.weight = sanitizedWeight;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [dimension] = await db
      .update(playbookAnalysisDimensions)
      .set(patch)
      .where(eq(playbookAnalysisDimensions.id, dimId))
      .returning();
    return NextResponse.json({ dimension });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a dimensão." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; dimId: string }> }
) {
  const { id, versionId, stageId, blockId, dimId } = await params;

  try {
    const chain = await loadDimensionInBlock(id, versionId, stageId, blockId, dimId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Dimensão não encontrada." }, { status: 404 });
    }

    // ON DELETE CASCADE cuida dos critérios da dimensão.
    await db.delete(playbookAnalysisDimensions).where(eq(playbookAnalysisDimensions.id, dimId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a dimensão." }, { status: 500 });
  }
}
