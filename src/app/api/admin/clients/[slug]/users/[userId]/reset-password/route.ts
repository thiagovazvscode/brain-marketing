import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientMemberships, adminUsers } from "@/db/schema";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    // Confirma que o usuário de fato pertence a ESTE cliente antes de mexer
    // na senha dele — evita resetar a senha de alguém via um slug errado.
    const [membership] = await db
      .select({ id: clientMemberships.id })
      .from(clientMemberships)
      .where(and(eq(clientMemberships.clientId, client.id), eq(clientMemberships.userId, userId)))
      .limit(1);
    if (!membership) return NextResponse.json({ error: "Usuário não pertence a este cliente." }, { status: 404 });

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await db.update(adminUsers).set({ passwordHash, passwordChangeRequired: true }).where(eq(adminUsers.id, userId));

    return NextResponse.json({ ok: true, temporaryPassword });
  } catch {
    return NextResponse.json({ error: "Não foi possível redefinir a senha." }, { status: 500 });
  }
}
