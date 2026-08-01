import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { methodStages } from "@/db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params;

  let body: Partial<{
    name: string;
    objective: string;
    description: string;
    expectedResult: string;
    successCriteria: string;
    sortOrder: number;
  }>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.objective !== undefined) patch.objective = body.objective.trim() || null;
  if (body.description !== undefined) patch.description = body.description.trim() || null;
  if (body.expectedResult !== undefined) patch.expectedResult = body.expectedResult.trim() || null;
  if (body.successCriteria !== undefined) patch.successCriteria = body.successCriteria.trim() || null;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;

  try {
    // Escopado por methodId além do stageId: a etapa só é atualizada se
    // pertencer ao método da própria URL, senão retorna 404 (sem revelar se
    // o stageId existe em outro método).
    const [stage] = await db
      .update(methodStages)
      .set(patch)
      .where(and(eq(methodStages.id, stageId), eq(methodStages.methodId, id)))
      .returning();
    if (!stage) return NextResponse.json({ error: "Macroetapa não encontrada." }, { status: 404 });
    return NextResponse.json({ stage });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a macroetapa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params;
  try {
    const [deleted] = await db
      .delete(methodStages)
      .where(and(eq(methodStages.id, stageId), eq(methodStages.methodId, id)))
      .returning({ id: methodStages.id });
    if (!deleted) return NextResponse.json({ error: "Macroetapa não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a macroetapa." }, { status: 500 });
  }
}
