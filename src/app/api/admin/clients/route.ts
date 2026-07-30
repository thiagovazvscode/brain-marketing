import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefings } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: clients.id,
        slug: clients.slug,
        name: clients.name,
        whatsapp: clients.whatsapp,
        createdAt: clients.createdAt,
        briefingsCount: sql<number>`count(${clientBriefings.id})`,
        lastSubmittedAt: sql<string | null>`max(${clientBriefings.submittedAt})`,
      })
      .from(clients)
      .leftJoin(clientBriefings, eq(clientBriefings.clientId, clients.id))
      .groupBy(clients.id)
      .orderBy(desc(clients.createdAt));

    return NextResponse.json({ clients: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os clientes." }, { status: 500 });
  }
}
