import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { products, productPlans } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

    const plans = await db
      .select()
      .from(productPlans)
      .where(eq(productPlans.productId, product.id))
      .orderBy(asc(productPlans.sortOrder));
    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os planos." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: {
    name?: string;
    description?: string;
    billingType?: "recorrente" | "pontual";
    billingCycle?: "mensal" | "trimestral" | "semestral" | "anual" | "unico";
    basePrice?: string;
    isDefault?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome do plano é obrigatório." }, { status: 400 });
  }

  try {
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

    const [plan] = await db
      .insert(productPlans)
      .values({
        productId: product.id,
        name,
        description: body.description?.trim() || null,
        billingType: body.billingType ?? "recorrente",
        billingCycle: body.billingCycle ?? "mensal",
        basePrice: body.basePrice ?? "0",
        isDefault: body.isDefault ?? false,
      })
      .returning();
    return NextResponse.json({ plan }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o plano." }, { status: 500 });
  }
}
