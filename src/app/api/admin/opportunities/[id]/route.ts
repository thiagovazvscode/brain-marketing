import { NextResponse } from "next/server";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  opportunities,
  opportunityProducts,
  opportunityActivities,
  opportunityStageHistory,
  opportunityDocuments,
  pipelineStages,
  products,
  productPlans,
  adminUsers,
} from "@/db/schema";
import { isValidSource } from "@/lib/crm";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!opportunity) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });

    const [interesse, atividades, historico, documentos] = await Promise.all([
      db
        .select({
          id: opportunityProducts.id,
          productId: opportunityProducts.productId,
          productName: products.name,
          planId: opportunityProducts.planId,
          planName: productPlans.name,
          estimatedValue: opportunityProducts.estimatedValue,
          notes: opportunityProducts.notes,
        })
        .from(opportunityProducts)
        .innerJoin(products, eq(products.id, opportunityProducts.productId))
        .leftJoin(productPlans, eq(productPlans.id, opportunityProducts.planId))
        .where(eq(opportunityProducts.opportunityId, id)),
      db
        .select({
          id: opportunityActivities.id,
          type: opportunityActivities.type,
          title: opportunityActivities.title,
          description: opportunityActivities.description,
          dueAt: opportunityActivities.dueAt,
          doneAt: opportunityActivities.doneAt,
          authorName: adminUsers.name,
          createdAt: opportunityActivities.createdAt,
        })
        .from(opportunityActivities)
        .leftJoin(adminUsers, eq(adminUsers.id, opportunityActivities.createdBy))
        .where(eq(opportunityActivities.opportunityId, id))
        .orderBy(desc(opportunityActivities.createdAt)),
      db
        .select({
          id: opportunityStageHistory.id,
          toStageName: pipelineStages.name,
          note: opportunityStageHistory.note,
          changedAt: opportunityStageHistory.changedAt,
        })
        .from(opportunityStageHistory)
        .innerJoin(pipelineStages, eq(pipelineStages.id, opportunityStageHistory.toStageId))
        .where(eq(opportunityStageHistory.opportunityId, id))
        .orderBy(desc(opportunityStageHistory.changedAt)),
      db
        .select()
        .from(opportunityDocuments)
        .where(eq(opportunityDocuments.opportunityId, id))
        .orderBy(asc(opportunityDocuments.addedAt)),
    ]);

    return NextResponse.json({
      opportunity,
      products: interesse,
      activities: atividades,
      history: historico,
      documents: documentos,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a oportunidade." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (typeof body.source === "string" && body.source && !isValidSource(body.source)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
  }

  const updates: Partial<typeof opportunities.$inferInsert> = { updatedAt: new Date() };
  const textFields = [
    "title",
    "contactName",
    "companyName",
    "phone",
    "whatsapp",
    "email",
    "source",
    "nextAction",
    "notes",
  ] as const;
  for (const f of textFields) {
    if (body[f] !== undefined) {
      const v = typeof body[f] === "string" ? (body[f] as string).trim() : null;
      (updates as Record<string, unknown>)[f] = v || null;
    }
  }
  if (body.estimatedValue !== undefined) updates.estimatedValue = (body.estimatedValue as string) || null;
  if (body.nextActionDate !== undefined) updates.nextActionDate = (body.nextActionDate as string) || null;
  if (body.expectedCloseDate !== undefined) updates.expectedCloseDate = (body.expectedCloseDate as string) || null;
  if (body.ownerId !== undefined) updates.ownerId = (body.ownerId as string) || null;
  if (body.priority !== undefined) updates.priority = body.priority as "baixa" | "media" | "alta" | "urgente";
  if (body.probability !== undefined) {
    updates.probability = Math.max(0, Math.min(100, Number(body.probability) || 0));
  }

  try {
    const [updated] = await db.update(opportunities).set(updates).where(eq(opportunities.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });
    return NextResponse.json({ opportunity: updated });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a oportunidade." }, { status: 500 });
  }
}
