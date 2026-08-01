import { NextResponse } from "next/server";
import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  opportunities,
  pipelines,
  pipelineStages,
  opportunityStageHistory,
  adminUsers,
} from "@/db/schema";
import { isValidSource } from "@/lib/crm";

// Lista oportunidades do funil. Sem paginação por enquanto: o volume de um
// funil comercial de agência cabe numa tela; se passar de alguns milhares,
// pagina-se por coluna (ver riscos no design.md).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const ownerFilter = searchParams.get("owner");

  try {
    const conditions = [];
    if (statusFilter === "aberta" || statusFilter === "ganha" || statusFilter === "perdida") {
      conditions.push(eq(opportunities.status, statusFilter));
    }
    if (ownerFilter) conditions.push(eq(opportunities.ownerId, ownerFilter));

    const rows = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        contactName: opportunities.contactName,
        companyName: opportunities.companyName,
        phone: opportunities.phone,
        whatsapp: opportunities.whatsapp,
        email: opportunities.email,
        source: opportunities.source,
        estimatedValue: opportunities.estimatedValue,
        probability: opportunities.probability,
        priority: opportunities.priority,
        status: opportunities.status,
        stageId: opportunities.stageId,
        stageName: pipelineStages.name,
        stageIsWon: pipelineStages.isWon,
        stageIsLost: pipelineStages.isLost,
        stuckAfterDays: pipelineStages.stuckAfterDays,
        stageEnteredAt: opportunities.stageEnteredAt,
        nextAction: opportunities.nextAction,
        nextActionDate: opportunities.nextActionDate,
        expectedCloseDate: opportunities.expectedCloseDate,
        ownerId: opportunities.ownerId,
        ownerName: adminUsers.name,
        ownerEmail: adminUsers.email,
        lostReason: opportunities.lostReason,
        createdAt: opportunities.createdAt,
      })
      .from(opportunities)
      .innerJoin(pipelineStages, eq(pipelineStages.id, opportunities.stageId))
      .leftJoin(adminUsers, eq(adminUsers.id, opportunities.ownerId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(opportunities.updatedAt));

    return NextResponse.json({ opportunities: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as oportunidades." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    title?: string;
    contactName?: string;
    companyName?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    source?: string;
    estimatedValue?: string;
    priority?: "baixa" | "media" | "alta" | "urgente";
    stageId?: string;
    pipelineId?: string;
    ownerId?: string;
    leadId?: string;
    clientId?: string;
    nextAction?: string;
    nextActionDate?: string;
    expectedCloseDate?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Título da oportunidade é obrigatório." }, { status: 400 });
  }
  if (body.source && !isValidSource(body.source)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
  }

  try {
    // Sem pipeline informado, usa o padrão — e sem etapa informada, a primeira
    // do funil. Assim criar oportunidade pela tela não exige escolher funil.
    let pipelineId = body.pipelineId;
    if (!pipelineId) {
      const [defaultPipeline] = await db
        .select({ id: pipelines.id })
        .from(pipelines)
        .where(eq(pipelines.isDefault, true))
        .limit(1);
      if (!defaultPipeline) {
        return NextResponse.json(
          { error: "Nenhum funil configurado. Rode: npm run db:seed:pipeline" },
          { status: 400 }
        );
      }
      pipelineId = defaultPipeline.id;
    }

    let stageId = body.stageId;
    let probability = 0;
    if (stageId) {
      const [stage] = await db
        .select({ p: pipelineStages.defaultProbability })
        .from(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
        .limit(1);
      probability = stage?.p ?? 0;
    } else {
      const [firstStage] = await db
        .select({ id: pipelineStages.id, p: pipelineStages.defaultProbability })
        .from(pipelineStages)
        .where(and(eq(pipelineStages.pipelineId, pipelineId), eq(pipelineStages.isActive, true)))
        .orderBy(pipelineStages.sortOrder)
        .limit(1);
      if (!firstStage) {
        return NextResponse.json(
          { error: "Funil sem etapas. Rode: npm run db:seed:pipeline" },
          { status: 400 }
        );
      }
      stageId = firstStage.id;
      probability = firstStage.p;
    }

    const [created] = await db
      .insert(opportunities)
      .values({
        pipelineId,
        stageId,
        leadId: body.leadId || null,
        clientId: body.clientId || null,
        title,
        contactName: body.contactName?.trim() || null,
        companyName: body.companyName?.trim() || null,
        phone: body.phone?.trim() || null,
        whatsapp: body.whatsapp?.trim() || null,
        email: body.email?.trim() || null,
        source: body.source || null,
        estimatedValue: body.estimatedValue || null,
        probability,
        priority: body.priority ?? "media",
        ownerId: body.ownerId || null,
        nextAction: body.nextAction?.trim() || null,
        nextActionDate: body.nextActionDate || null,
        expectedCloseDate: body.expectedCloseDate || null,
        notes: body.notes?.trim() || null,
      })
      .returning();

    await db.insert(opportunityStageHistory).values({
      opportunityId: created.id,
      fromStageId: null,
      toStageId: stageId,
      note: "Oportunidade criada",
    });

    return NextResponse.json({ opportunity: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a oportunidade." }, { status: 500 });
  }
}
