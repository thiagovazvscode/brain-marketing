import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientProducts, clientStageHistory, products } from "@/db/schema";
import { computeImpactOnMrr } from "@/lib/billing";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const rows = await db
      .select({
        id: clientProducts.id,
        productId: clientProducts.productId,
        productSlug: products.slug,
        productName: products.name,
        status: clientProducts.status,
        currentStage: clientProducts.currentStage,
        startedAt: clientProducts.startedAt,
        endedAt: clientProducts.endedAt,
        notes: clientProducts.notes,
        updatedAt: clientProducts.updatedAt,
      })
      .from(clientProducts)
      .innerJoin(products, eq(products.id, clientProducts.productId))
      .where(eq(clientProducts.clientId, client.id))
      .orderBy(desc(clientProducts.createdAt));

    return NextResponse.json({ engagements: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os produtos do cliente." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: {
    productId?: string;
    notes?: string;
    negotiatedValue?: string;
    discount?: string;
    billingType?: "recorrente" | "pontual";
    billingCycle?: "mensal" | "trimestral" | "semestral" | "anual" | "unico";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.productId) {
    return NextResponse.json({ error: "Produto é obrigatório." }, { status: 400 });
  }

  const billingType = body.billingType ?? "recorrente";

  try {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const [engagement] = await db
      .insert(clientProducts)
      .values({
        clientId: client.id,
        productId: body.productId,
        notes: body.notes?.trim() || null,
        negotiatedValue: body.negotiatedValue || null,
        discount: body.discount || null,
        billingType,
        billingCycle: body.billingCycle ?? "mensal",
        impactOnMrr: String(computeImpactOnMrr(billingType, body.negotiatedValue ?? null, body.discount ?? null)),
      })
      .returning();

    await db.insert(clientStageHistory).values({
      clientProductId: engagement.id,
      fromStage: null,
      toStage: engagement.currentStage,
      note: "Engajamento iniciado",
    });

    return NextResponse.json({ engagement }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível associar o produto." }, { status: 500 });
  }
}
