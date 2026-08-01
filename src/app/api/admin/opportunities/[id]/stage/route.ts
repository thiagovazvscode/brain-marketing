import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { opportunities, pipelineStages, opportunityStageHistory, opportunityActivities } from "@/db/schema";
import { isValidLossReason, lossReasonLabel } from "@/lib/crm";

// Move a oportunidade de etapa (drag and drop do Kanban).
//
// Três regras que fazem esta rota não ser um simples UPDATE de status:
//
// 1. Etapa "perdida" EXIGE motivo — perder sem registrar o porquê joga fora a
//    única informação que faz o funil melhorar.
// 2. Etapa "ganha" NÃO fecha sozinha: responde requiresConversion e deixa a
//    oportunidade aberta. Ganhar significa criar cliente + contratação + MRR,
//    e isso é o wizard da etapa 2.5 — marcar "ganha" sem a venda existir
//    produziria um funil que mente sobre a receita.
// 3. Toda movimentação reinicia stageEnteredAt e grava histórico — é o que
//    permite medir tempo de ciclo e disparar o alerta de parada.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { stageId?: string; lostReason?: string; lostNotes?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.stageId) {
    return NextResponse.json({ error: "Etapa de destino é obrigatória." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });

    const [stage] = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, body.stageId))
      .limit(1);
    if (!stage) return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });

    if (existing.stageId === stage.id) {
      return NextResponse.json({ opportunity: existing, unchanged: true });
    }

    if (stage.isLost && !body.lostReason) {
      return NextResponse.json(
        { error: "Informe o motivo da perda.", requiresLossReason: true },
        { status: 400 }
      );
    }
    if (body.lostReason && !isValidLossReason(body.lostReason)) {
      return NextResponse.json({ error: "Motivo de perda inválido." }, { status: 400 });
    }

    const now = new Date();
    const updates: Partial<typeof opportunities.$inferInsert> = {
      stageId: stage.id,
      stageEnteredAt: now,
      probability: stage.defaultProbability,
      updatedAt: now,
    };

    if (stage.isLost) {
      updates.status = "perdida";
      updates.lostReason = body.lostReason;
      updates.lostNotes = body.lostNotes?.trim() || null;
      updates.lostAt = now;
    } else {
      // Voltar de "perdida" para uma etapa ativa reabre e limpa o motivo —
      // senão a oportunidade fica aberta carregando um motivo de perda velho.
      updates.status = "aberta";
      updates.lostReason = null;
      updates.lostNotes = null;
      updates.lostAt = null;
    }

    const [updated] = await db.update(opportunities).set(updates).where(eq(opportunities.id, id)).returning();

    await db.insert(opportunityStageHistory).values({
      opportunityId: id,
      fromStageId: existing.stageId,
      toStageId: stage.id,
      note: body.note?.trim() || null,
    });

    await db.insert(opportunityActivities).values({
      opportunityId: id,
      type: stage.isLost ? "mudanca-etapa" : "mudanca-etapa",
      title: stage.isLost
        ? `Marcada como perdida: ${lossReasonLabel(body.lostReason ?? null)}`
        : `Movida para "${stage.name}"`,
      description: body.lostNotes?.trim() || body.note?.trim() || null,
      doneAt: now,
    });

    return NextResponse.json({
      opportunity: updated,
      // O front usa isto pra abrir o wizard de contratação (etapa 2.5).
      requiresConversion: stage.isWon,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível mover a oportunidade." }, { status: 500 });
  }
}
