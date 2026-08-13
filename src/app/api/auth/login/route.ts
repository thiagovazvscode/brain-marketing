import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, clientMemberships } from "@/db/schema";
import { createSessionToken, verifyPassword, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";

// Função, não um objeto NextResponse compartilhado no módulo — o corpo de um
// Response só pode ser lido uma vez; um singleton reusado entre requests
// (o módulo do route handler é cacheado no processo) devolvia corpo vazio a
// partir da segunda tentativa de login malsucedida (bug pré-existente,
// mascarado até aqui porque as telas de login usam uma mensagem fixa em vez
// de ler o corpo da resposta).
function genericError() {
  return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string; rememberMe?: boolean };
  try {
    body = await request.json();
  } catch {
    return genericError();
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  // Default true — preserva o comportamento atual de /admin/login, que
  // nunca envia esse campo.
  const rememberMe = body.rememberMe ?? true;
  if (!email || !password) return genericError();

  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (!user) return genericError();

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return genericError();

    if (user.role === "cliente") {
      // "Último acesso" pro admin (item 11) — atualizado no login, não a
      // cada pageview (evita write extra em toda navegação do portal).
      await db
        .update(clientMemberships)
        .set({ lastAccessAt: new Date() })
        .where(and(eq(clientMemberships.userId, user.id), eq(clientMemberships.status, "ativo")));
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      passwordChangeRequired: user.passwordChangeRequired,
    });
    const response = NextResponse.json({ ok: true, role: user.role, passwordChangeRequired: user.passwordChangeRequired });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      // "Lembrar de mim" desmarcado = cookie de sessão (some ao fechar o
      // navegador); marcado = persiste pelos mesmos 7 dias rolling do resto
      // da sessão. O JWT em si sempre expira em 7 dias de qualquer forma —
      // isso só controla se o COOKIE sobrevive ao fechar o navegador.
      ...(rememberMe ? { maxAge: SESSION_DURATION_SECONDS } : {}),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Não foi possível autenticar agora." }, { status: 500 });
  }
}
