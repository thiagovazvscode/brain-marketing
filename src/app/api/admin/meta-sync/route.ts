import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { syncMetaAccount, syncAllActiveClients } from "@/lib/meta/sync-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Sincronização manual ("Atualizar agora") — protegida pela sessão de admin
 * já existente (este caminho cai sob o matcher /api/admin/:path* de
 * src/proxy.ts, que exige cookie de sessão válido; nenhuma lógica de auth
 * nova foi criada aqui). Não aparece na página pública do cliente.
 *
 * Body opcional: { clientSlug: string } — sincroniza só esse cliente.
 * Sem body/clientSlug: sincroniza todos os clientes conectados.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const clientSlug = typeof body?.clientSlug === "string" ? body.clientSlug : undefined;

  if (clientSlug) {
    const [client] = await db.select().from(clients).where(eq(clients.slug, clientSlug)).limit(1);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    const result = await syncMetaAccount(client.id, "manual");
    return NextResponse.json({ clientSlug, result });
  }

  const results = await syncAllActiveClients("manual");
  return NextResponse.json({
    syncedClients: results.length,
    results: results.map((r) => ({ clientSlug: r.clientSlug, ...r.result })),
  });
}
