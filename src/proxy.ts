import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";
import { getAuthorizedClientForUser, userHasAccessToClientSlug } from "@/lib/client-access";

// proxy.ts sempre roda em Node.js no Next 16 (nunca Edge) — não precisa e
// não pode declarar `runtime` aqui (erro de build). O driver neon-http
// (fetch-based) usado por getAuthorizedClientForUser/userHasAccessToClientSlug
// funciona nos dois runtimes de qualquer forma.

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/api/reports/:path*",
    "/account/:path*",
    "/api/account/:path*",
    "/definir-senha",
    "/login",
  ],
};

function clientSlugFrom(pathname: string): string | null {
  const dashboardMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  if (dashboardMatch) return decodeURIComponent(dashboardMatch[1]);
  const reportsMatch = pathname.match(/^\/api\/reports\/([^/]+)/);
  if (reportsMatch) return decodeURIComponent(reportsMatch[1]);
  return null;
}

async function renewedResponse(next: NextResponse, session: { userId: string; email: string; role: string; passwordChangeRequired: boolean }) {
  const renewedToken = await createSessionToken(session);
  next.cookies.set(SESSION_COOKIE, renewedToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
  return next;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRequest = pathname.startsWith("/api/");
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // /login é público, mas se já existir sessão de cliente válida, poupa um
  // clique e manda direto pro dashboard dela.
  if (pathname === "/login") {
    if (session && session.role === "cliente") {
      const authorized = await getAuthorizedClientForUser(session.userId);
      if (authorized) return NextResponse.redirect(new URL(`/dashboard/${authorized.slug}`, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (isApiRequest) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  // Cliente nunca acessa /admin ou /api/admin (item 10) — independente de
  // ter ou não client_id autorizado.
  if (isAdminArea && session.role === "cliente") {
    if (isApiRequest) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Área do portal (/dashboard, /api/reports, /account, /api/account,
  // /definir-senha) — staff (qualquer role != "cliente") passa direto, sem
  // restrição de cliente: é a capacidade de "Abrir dashboard" do Admin
  // (item 11), sem precisar de um sistema de impersonation à parte.
  if (!isAdminArea && session.role === "cliente") {
    const authorized = await getAuthorizedClientForUser(session.userId);
    if (!authorized) {
      if (isApiRequest) return NextResponse.json({ error: "forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/login?erro=sem-acesso", request.url));
    }

    // Troca de senha obrigatória (primeiro acesso) — bloqueia tudo no
    // portal exceto a própria página/API de troca, senão o cliente nunca
    // sai do loop.
    const isPasswordChangeRoute = pathname === "/definir-senha" || pathname === "/api/account/change-password";
    if (session.passwordChangeRequired && !isPasswordChangeRoute) {
      if (isApiRequest) return NextResponse.json({ error: "password_change_required" }, { status: 403 });
      return NextResponse.redirect(new URL("/definir-senha", request.url));
    }

    if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL(`/dashboard/${authorized.slug}`, request.url));
    }

    const requestedSlug = clientSlugFrom(pathname);
    if (requestedSlug) {
      // Confia no membership resolvido acima só quando bate com o slug
      // pedido; qualquer slug diferente (URL trocada manualmente, request
      // direto à API) passa por uma checagem própria antes de liberar —
      // nunca assume que "autorizado pra algum cliente" == "autorizado pra
      // ESTE cliente" (item 9).
      const hasAccess = requestedSlug === authorized.slug || (await userHasAccessToClientSlug(session.userId, requestedSlug));
      if (!hasAccess) {
        if (isApiRequest) return NextResponse.json({ error: "forbidden" }, { status: 403 });
        return NextResponse.redirect(new URL(`/dashboard/${authorized.slug}`, request.url));
      }
    }

    return renewedResponse(NextResponse.next(), session);
  }

  // Staff no portal: bare /dashboard não tem cliente escolhido — manda pro
  // Admin escolher um.
  if (!isAdminArea && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin/clients", request.url));
  }

  return renewedResponse(NextResponse.next(), session);
}
