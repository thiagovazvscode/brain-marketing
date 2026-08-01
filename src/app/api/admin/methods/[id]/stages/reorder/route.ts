import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { methodStages } from "@/db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const orderedIds = body.orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    return NextResponse.json({ error: "Lista de macroetapas é obrigatória." }, { status: 400 });
  }

  try {
    await Promise.all(
      orderedIds.map((stageId, index) =>
        db
          .update(methodStages)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(methodStages.id, stageId), eq(methodStages.methodId, id)))
      )
    );
    const stages = await db.select().from(methodStages).where(eq(methodStages.methodId, id)).orderBy(asc(methodStages.sortOrder));
    return NextResponse.json({ stages });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar as macroetapas." }, { status: 500 });
  }
}
