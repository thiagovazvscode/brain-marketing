import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientProducts, clientStageHistory, clientEngagementStatusEnum } from "@/db/schema";
import { isValidMethodStage } from "@/lib/method-stages";
import { computeImpactOnMrr, isValidOnboardingStatus, isValidOperationalStatus } from "@/lib/billing";

const VALID_STATUSES = clientEngagementStatusEnum.enumValues;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: {
    status?: string;
    currentStage?: string;
    notes?: string;
    negotiatedValue?: string;
    discount?: string;
    billingType?: "recorrente" | "pontual";
    billingCycle?: "mensal" | "trimestral" | "semestral" | "anual" | "unico";
    responsibleUserId?: string;
    onboardingStatus?: string;
    implementationProgress?: number;
    operationalStatus?: string;
    nextAction?: string;
    nextActionDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(clientProducts).where(eq(clientProducts.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Engajamento não encontrado." }, { status: 404 });

    const updates: Partial<typeof clientProducts.$inferInsert> = { updatedAt: new Date() };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      }
      updates.status = body.status as (typeof VALID_STATUSES)[number];
      if (body.status === "encerrado" && !existing.endedAt) {
        updates.endedAt = new Date().toISOString().slice(0, 10);
      }
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes?.trim() || null;
    }

    if (body.negotiatedValue !== undefined || body.billingType !== undefined || body.discount !== undefined) {
      const billingType = body.billingType ?? existing.billingType;
      const negotiatedValue = body.negotiatedValue ?? existing.negotiatedValue;
      const discount = body.discount ?? existing.discount;
      if (body.negotiatedValue !== undefined) updates.negotiatedValue = body.negotiatedValue || null;
      if (body.discount !== undefined) updates.discount = body.discount || null;
      if (body.billingType !== undefined) updates.billingType = body.billingType;
      updates.impactOnMrr = String(computeImpactOnMrr(billingType, negotiatedValue, discount));
    }
    if (body.billingCycle !== undefined) updates.billingCycle = body.billingCycle;
    if (body.responsibleUserId !== undefined) updates.responsibleUserId = body.responsibleUserId || null;
    if (body.onboardingStatus !== undefined) {
      if (!isValidOnboardingStatus(body.onboardingStatus)) {
        return NextResponse.json({ error: "Status de onboarding inválido." }, { status: 400 });
      }
      updates.onboardingStatus = body.onboardingStatus;
    }
    if (body.implementationProgress !== undefined) {
      updates.implementationProgress = Math.max(0, Math.min(100, body.implementationProgress));
    }
    if (body.operationalStatus !== undefined) {
      if (!isValidOperationalStatus(body.operationalStatus)) {
        return NextResponse.json({ error: "Status operacional inválido." }, { status: 400 });
      }
      updates.operationalStatus = body.operationalStatus;
    }
    if (body.nextAction !== undefined) updates.nextAction = body.nextAction.trim() || null;
    if (body.nextActionDate !== undefined) updates.nextActionDate = body.nextActionDate || null;

    let stageChanged = false;
    if (body.currentStage !== undefined && body.currentStage !== existing.currentStage) {
      if (!isValidMethodStage(body.currentStage)) {
        return NextResponse.json({ error: "Estágio inválido." }, { status: 400 });
      }
      updates.currentStage = body.currentStage;
      stageChanged = true;
    }

    const [updated] = await db.update(clientProducts).set(updates).where(eq(clientProducts.id, id)).returning();

    if (stageChanged) {
      await db.insert(clientStageHistory).values({
        clientProductId: id,
        fromStage: existing.currentStage,
        toStage: updated.currentStage,
      });
    }

    return NextResponse.json({ engagement: updated });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o engajamento." }, { status: 500 });
  }
}
