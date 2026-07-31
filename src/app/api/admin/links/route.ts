import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { trackedLinks, linkClicks, clients } from "@/db/schema";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: trackedLinks.id,
        slug: trackedLinks.slug,
        label: trackedLinks.label,
        destinationUrl: trackedLinks.destinationUrl,
        campaign: trackedLinks.campaign,
        isActive: trackedLinks.isActive,
        ownerClientId: trackedLinks.ownerClientId,
        ownerClientName: clients.name,
        createdAt: trackedLinks.createdAt,
        totalClicks: sql<number>`count(${linkClicks.id})`,
        clicksLast30d: sql<number>`count(${linkClicks.id}) filter (where ${linkClicks.createdAt} >= ${since30d})`,
      })
      .from(trackedLinks)
      .leftJoin(linkClicks, eq(linkClicks.linkId, trackedLinks.id))
      .leftJoin(clients, eq(clients.id, trackedLinks.ownerClientId))
      .groupBy(trackedLinks.id, clients.name)
      .orderBy(desc(sql`count(${linkClicks.id})`));

    return NextResponse.json({ links: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os links." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { label?: string; destinationUrl?: string; campaign?: string; ownerClientId?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const label = body.label?.trim();
  const destinationUrl = body.destinationUrl?.trim();
  if (!label || !destinationUrl) {
    return NextResponse.json({ error: "Rótulo e URL de destino são obrigatórios." }, { status: 400 });
  }

  try {
    new URL(destinationUrl);
  } catch {
    return NextResponse.json({ error: "URL de destino inválida." }, { status: 400 });
  }

  const slug = slugify(body.slug?.trim() || label);
  if (!slug) {
    return NextResponse.json({ error: "Não foi possível gerar um slug válido." }, { status: 400 });
  }

  try {
    const [existing] = await db.select({ id: trackedLinks.id }).from(trackedLinks).where(eq(trackedLinks.slug, slug)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Já existe um link com esse slug." }, { status: 409 });
    }

    const [inserted] = await db
      .insert(trackedLinks)
      .values({
        slug,
        label,
        destinationUrl,
        campaign: body.campaign?.trim() || null,
        ownerClientId: body.ownerClientId || null,
      })
      .returning();

    return NextResponse.json({ link: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o link." }, { status: 500 });
  }
}
