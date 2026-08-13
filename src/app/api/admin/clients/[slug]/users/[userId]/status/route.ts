import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientMemberships } from "@/db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (body.status !== "ativo" && body.status !== "inativo") {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const result = await db
      .update(clientMemberships)
      .set({ status: body.status, updatedAt: new Date() })
      .where(and(eq(clientMemberships.clientId, client.id), eq(clientMemberships.userId, userId)))
      .returning({ id: clientMemberships.id });

    if (result.length === 0) return NextResponse.json({ error: "Usuário não pertence a este cliente." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 500 });
  }
}
