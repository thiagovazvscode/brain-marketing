import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { createSessionToken, verifyPassword, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";

const genericError = NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return genericError;
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) return genericError;

  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (!user) return genericError;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return genericError;

    const token = await createSessionToken({ userId: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Não foi possível autenticar agora." }, { status: 500 });
  }
}
