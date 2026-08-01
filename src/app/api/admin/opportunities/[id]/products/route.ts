import { NextResponse } from "next/server";
import { db } from "@/db";
import { opportunityProducts } from "@/db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { productId?: string; planId?: string; estimatedValue?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.productId) return NextResponse.json({ error: "Selecione um produto." }, { status: 400 });

  try {
    const [row] = await db
      .insert(opportunityProducts)
      .values({
        opportunityId: id,
        productId: body.productId,
        planId: body.planId || null,
        estimatedValue: body.estimatedValue || null,
        notes: body.notes?.trim() || null,
      })
      .returning();
    return NextResponse.json({ product: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível adicionar o produto." }, { status: 500 });
  }
}
