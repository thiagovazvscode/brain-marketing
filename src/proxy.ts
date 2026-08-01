import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Renova a sessão a cada request válido (rolling 7 dias).
  const response = NextResponse.next();
  const renewedToken = await createSessionToken({ userId: session.userId, email: session.email, role: session.role });
  response.cookies.set(SESSION_COOKIE, renewedToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
  return response;
}
