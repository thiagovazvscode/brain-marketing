import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o produto." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: {
    name?: string;
    shortDescription?: string;
    category?: string;
    isActive?: boolean;
    isEntryProduct?: boolean;
    sortOrder?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.shortDescription !== undefined) patch.shortDescription = body.shortDescription.trim() || null;
  if (body.category !== undefined) patch.category = body.category.trim() || null;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  if (body.isEntryProduct !== undefined) patch.isEntryProduct = body.isEntryProduct;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;

  try {
    const [product] = await db.update(products).set(patch).where(eq(products.slug, slug)).returning();
    if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o produto." }, { status: 500 });
  }
}
