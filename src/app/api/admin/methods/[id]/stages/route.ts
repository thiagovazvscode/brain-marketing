import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { methodStages } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const stages = await db.select().from(methodStages).where(eq(methodStages.methodId, id)).orderBy(asc(methodStages.sortOrder));
    return NextResponse.json({ stages });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as macroetapas." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { name?: string; objective?: string; description?: string; expectedResult?: string; successCriteria?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Nome da macroetapa é obrigatório." }, { status: 400 });

  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(methodStages).where(eq(methodStages.methodId, id));
    const [stage] = await db
      .insert(methodStages)
      .values({
        methodId: id,
        name,
        sortOrder: count,
        objective: body.objective?.trim() || null,
        description: body.description?.trim() || null,
        expectedResult: body.expectedResult?.trim() || null,
        successCriteria: body.successCriteria?.trim() || null,
      })
      .returning();
    return NextResponse.json({ stage }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a macroetapa." }, { status: 500 });
  }
}
