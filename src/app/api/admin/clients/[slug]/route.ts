import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefings } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const [client] = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const briefings = await db
      .select()
      .from(clientBriefings)
      .where(eq(clientBriefings.clientId, client.id))
      .orderBy(desc(clientBriefings.submittedAt));

    return NextResponse.json({ client, briefings });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o cliente." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: { name?: string; whatsapp?: string | null; enteredAt?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const [existing] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const updates: Partial<typeof clients.$inferInsert> = {};
    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Nome não pode ficar vazio." }, { status: 400 });
      }
      updates.name = trimmed;
    }
    if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp?.trim() || null;
    if (body.enteredAt !== undefined) updates.enteredAt = body.enteredAt;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
    }

    const [updated] = await db.update(clients).set(updates).where(eq(clients.id, existing.id)).returning();
    return NextResponse.json({ client: updated });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o cliente." }, { status: 500 });
  }
}
