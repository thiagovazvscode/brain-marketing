import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clientMemberships, clients } from "@/db/schema";

export type AuthorizedClient = { id: string; slug: string; name: string; membershipRole: string };

/**
 * Resolve QUAL cliente um usuário "cliente" pode acessar — sempre a partir
 * do userId da sessão (nunca de um client_id vindo do browser/URL). Se o
 * usuário tiver mais de um membership ativo (arquitetura já suporta,
 * embora a UI ainda não tenha um seletor), pega o primeiro por
 * created_at — MVP deliberado, documentado em vez de escondido.
 *
 * Retorna null quando não há nenhum membership ativo — tratado pelo
 * chamador (proxy.ts) como "sem acesso a nenhum cliente".
 */
export async function getAuthorizedClientForUser(userId: string): Promise<AuthorizedClient | null> {
  const rows = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      membershipRole: clientMemberships.role,
    })
    .from(clientMemberships)
    .innerJoin(clients, eq(clients.id, clientMemberships.clientId))
    .where(and(eq(clientMemberships.userId, userId), eq(clientMemberships.status, "ativo")))
    .orderBy(clientMemberships.createdAt)
    .limit(1);

  return rows[0] ?? null;
}

/**
 * true quando o usuário tem membership ATIVO especificamente pro slug
 * pedido — usado pelo proxy pra bloquear acesso cruzado (item 9: mesmo
 * trocando a URL, o servidor tem que barrar).
 */
export async function userHasAccessToClientSlug(userId: string, clientSlug: string): Promise<boolean> {
  const rows = await db
    .select({ id: clientMemberships.id })
    .from(clientMemberships)
    .innerJoin(clients, eq(clients.id, clientMemberships.clientId))
    .where(and(eq(clientMemberships.userId, userId), eq(clientMemberships.status, "ativo"), eq(clients.slug, clientSlug)))
    .limit(1);
  return rows.length > 0;
}
