import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productPlans } from "@/db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;

  let body: {
    name?: string;
    description?: string;
    billingType?: "recorrente" | "pontual";
    billingCycle?: "mensal" | "trimestral" | "semestral" | "anual" | "unico";
    basePrice?: string;
    isDefault?: boolean;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.description !== undefined) patch.description = body.description.trim() || null;
  if (body.billingType !== undefined) patch.billingType = body.billingType;
  if (body.billingCycle !== undefined) patch.billingCycle = body.billingCycle;
  if (body.basePrice !== undefined) patch.basePrice = body.basePrice;
  if (body.isDefault !== undefined) patch.isDefault = body.isDefault;
  if (body.isActive !== undefined) patch.isActive = body.isActive;

  try {
    const [plan] = await db.update(productPlans).set(patch).where(eq(productPlans.id, id)).returning();
    if (!plan) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o plano." }, { status: 500 });
  }
}
