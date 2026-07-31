import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientDiagnostics, clientProducts, products } from "@/db/schema";
import { computeBottleneck, computeRecommendations, type DiagnosticScores } from "@/lib/diagnostics";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const rows = await db
      .select()
      .from(clientDiagnostics)
      .where(eq(clientDiagnostics.clientId, client.id))
      .orderBy(desc(clientDiagnostics.createdAt));

    return NextResponse.json({ diagnostics: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os diagnósticos." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: { scores?: DiagnosticScores; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const scores = body.scores;
  if (
    !scores ||
    typeof scores.aquisicao !== "number" ||
    typeof scores.posicionamento !== "number" ||
    typeof scores.processoComercial !== "number" ||
    typeof scores.tecnologia !== "number"
  ) {
    return NextResponse.json({ error: "Notas por pilar (aquisicao, posicionamento, processoComercial, tecnologia) são obrigatórias." }, { status: 400 });
  }

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const activeEngagements = await db
      .select({ productSlug: products.slug })
      .from(clientProducts)
      .innerJoin(products, eq(products.id, clientProducts.productId))
      .where(eq(clientProducts.clientId, client.id));

    const activeSlugs = activeEngagements.map((e) => e.productSlug);
    const bottleneck = computeBottleneck(scores);
    const recommendations = computeRecommendations(scores, activeSlugs);

    const [diagnostic] = await db
      .insert(clientDiagnostics)
      .values({
        clientId: client.id,
        answers: body.answers ?? null,
        scores,
        bottleneck,
        recommendations,
      })
      .returning();

    return NextResponse.json({ diagnostic }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o diagnóstico." }, { status: 500 });
  }
}
