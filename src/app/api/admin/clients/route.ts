import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefings } from "@/db/schema";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: clients.id,
        slug: clients.slug,
        name: clients.name,
        whatsapp: clients.whatsapp,
        enteredAt: clients.enteredAt,
        createdAt: clients.createdAt,
        briefingsCount: sql<number>`count(${clientBriefings.id})`,
        lastSubmittedAt: sql<string | null>`max(${clientBriefings.submittedAt})`,
      })
      .from(clients)
      .leftJoin(clientBriefings, eq(clientBriefings.clientId, clients.id))
      .groupBy(clients.id)
      .orderBy(desc(clients.createdAt));

    return NextResponse.json({ clients: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os clientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { name?: string; whatsapp?: string; enteredAt?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const slug = slugify(body.slug?.trim() || name);
  if (!slug) {
    return NextResponse.json(
      { error: "Não foi possível gerar um slug válido a partir do nome." },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Já existe um cliente com esse slug." }, { status: 409 });
    }

    const [inserted] = await db
      .insert(clients)
      .values({
        slug,
        name,
        whatsapp: body.whatsapp?.trim() || null,
        enteredAt: body.enteredAt || null,
      })
      .returning();

    return NextResponse.json({ client: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o cliente." }, { status: 500 });
  }
}
