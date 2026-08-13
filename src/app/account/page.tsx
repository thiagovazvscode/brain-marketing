import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getAuthorizedClientForUser } from "@/lib/client-access";
import { AccountShell } from "./AccountShell";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  // proxy.ts já garante sessão válida pra chegar aqui — session nulo só em
  // corrida improvável entre cookie expirar e o proxy já ter deixado passar.
  if (!session) return null;

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.userId)).limit(1);
  const authorizedClient = session.role === "cliente" ? await getAuthorizedClientForUser(session.userId) : null;

  return (
    <AccountShell
      name={user?.name ?? "—"}
      email={user?.email ?? session.email}
      companyName={authorizedClient?.name ?? null}
      backHref={authorizedClient ? `/dashboard/${authorizedClient.slug}` : "/dashboard"}
    />
  );
}
