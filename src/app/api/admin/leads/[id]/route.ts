import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, leadStatusEnum } from "@/db/schema";

const VALID_STATUSES = leadStatusEnum.enumValues;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  try {
    await db
      .update(leads)
      .set({ status: body.status as (typeof VALID_STATUSES)[number], updatedAt: new Date() })
      .where(eq(leads.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o lead." }, { status: 500 });
  }
}
