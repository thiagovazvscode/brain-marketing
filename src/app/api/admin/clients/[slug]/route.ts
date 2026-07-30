import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefings } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const [client] = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const briefings = await db
      .select()
      .from(clientBriefings)
      .where(eq(clientBriefings.clientId, client.id))
      .orderBy(desc(clientBriefings.submittedAt));

    return NextResponse.json({ client, briefings });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o cliente." }, { status: 500 });
  }
}
