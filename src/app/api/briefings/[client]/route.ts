import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefings } from "@/db/schema";

// Pública (sem login) — quem preenche é o próprio dono da agência durante a
// reunião, mesmo padrão de /api/leads ser pública. Fire-and-forget do lado do
// cliente: nunca deve quebrar o fluxo local de download do JSON/resumo.
export async function POST(request: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client: slug } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    let [clientRow] = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);

    if (!clientRow) {
      const name =
        typeof body.nomeEmpresa === "string" && body.nomeEmpresa.trim() ? body.nomeEmpresa.trim() : slug;
      const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp : null;
      [clientRow] = await db.insert(clients).values({ slug, name, whatsapp }).returning();
    }

    await db.insert(clientBriefings).values({ clientId: clientRow.id, payload: body });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
