import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { verifySessionToken, verifyPassword, hashPassword, createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";

// Única rota do portal que precisa saber QUEM está chamando (as demais rotas
// admin confiam inteiramente no proxy já ter bloqueado sessão ausente/errada
// — aqui é diferente porque a própria operação é "trocar a senha DESTE
// usuário", não um recurso identificado por slug/id na URL).
export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Informe a senha atual e a nova senha." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.userId)).limit(1);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });

  const newHash = await hashPassword(newPassword);
  await db
    .update(adminUsers)
    .set({ passwordHash: newHash, passwordChangeRequired: false })
    .where(eq(adminUsers.id, user.id));

  // Reemite a sessão já com passwordChangeRequired:false — senão o proxy
  // continuaria redirecionando pro fluxo de troca obrigatória até a sessão
  // antiga expirar.
  const newToken = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    passwordChangeRequired: false,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
  return response;
}
