import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pixelConfigs } from "@/db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Campo 'enabled' obrigatório." }, { status: 400 });
  }

  try {
    await db
      .update(pixelConfigs)
      .set({ enabled: body.enabled, updatedAt: new Date() })
      .where(eq(pixelConfigs.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o pixel." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await db.delete(pixelConfigs).where(eq(pixelConfigs.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover o pixel." }, { status: 500 });
  }
}
