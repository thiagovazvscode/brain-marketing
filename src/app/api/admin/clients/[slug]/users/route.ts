import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientMemberships, adminUsers, clientMembershipRoleEnum } from "@/db/schema";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth";

const VALID_ROLES = new Set(clientMembershipRoleEnum.enumValues);

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const rows = await db
      .select({
        id: clientMemberships.id,
        userId: adminUsers.id,
        name: adminUsers.name,
        email: adminUsers.email,
        role: clientMemberships.role,
        status: clientMemberships.status,
        lastAccessAt: clientMemberships.lastAccessAt,
      })
      .from(clientMemberships)
      .innerJoin(adminUsers, eq(adminUsers.id, clientMemberships.userId))
      .where(eq(clientMemberships.clientId, client.id))
      .orderBy(clientMemberships.createdAt);

    return NextResponse.json({ users: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os usuários do portal." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: { name?: string; email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = body.role ?? "gerente";
  if (!name || !email) return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  if (!VALID_ROLES.has(role as (typeof clientMembershipRoleEnum.enumValues)[number])) {
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
  }

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const [existingUser] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

    // E-mail já é de um usuário administrativo (não-cliente) — não deixamos
    // virar também login de portal, evita um mesmo e-mail acumulando dois
    // tipos de acesso muito diferentes sem intenção explícita.
    if (existingUser && existingUser.role !== "cliente") {
      return NextResponse.json({ error: "Este e-mail já pertence a um usuário administrativo da Brain." }, { status: 409 });
    }

    let userId: string;
    let temporaryPassword: string | null = null;

    if (existingUser) {
      // Pessoa que já tem login de portal (de outro cliente, por exemplo) —
      // reaproveita a conta, só adiciona o membership novo. Não mexe na
      // senha dela.
      userId = existingUser.id;
    } else {
      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      const [created] = await db
        .insert(adminUsers)
        .values({ name, email, passwordHash, role: "cliente", passwordChangeRequired: true })
        .returning({ id: adminUsers.id });
      userId = created.id;
    }

    const [existingMembership] = await db
      .select({ id: clientMemberships.id })
      .from(clientMemberships)
      .where(and(eq(clientMemberships.clientId, client.id), eq(clientMemberships.userId, userId)))
      .limit(1);
    if (existingMembership) {
      return NextResponse.json({ error: "Este usuário já tem acesso a este cliente." }, { status: 409 });
    }

    await db.insert(clientMemberships).values({
      clientId: client.id,
      userId,
      role: role as (typeof clientMembershipRoleEnum.enumValues)[number],
      status: "ativo",
    });

    return NextResponse.json({ ok: true, temporaryPassword }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o acesso." }, { status: 500 });
  }
}
