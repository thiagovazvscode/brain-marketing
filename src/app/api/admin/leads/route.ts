import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, quizSessions } from "@/db/schema";
import type { LeadStatus } from "@/types/tracking";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as LeadStatus | null;
  const service = searchParams.get("service");
  const utmCampaign = searchParams.get("utmCampaign");

  const conditions = [];
  if (status) conditions.push(eq(leads.status, status));
  if (service) conditions.push(eq(leads.service, service));
  if (utmCampaign) conditions.push(eq(leads.utmCampaign, utmCampaign));

  try {
    const rows = await db
      .select({ lead: leads, quizAnswers: quizSessions.answers })
      .from(leads)
      .leftJoin(quizSessions, eq(leads.quizSessionId, quizSessions.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leads.createdAt));

    const data = rows.map(({ lead, quizAnswers }) => ({
      ...lead,
      // v1: exibe as respostas do quiz como índices legíveis (ex.: "Passo 1: opção 2"),
      // sem reconstruir o texto das perguntas no servidor.
      quizAnswers: quizAnswers?.map((value, index) => `Passo ${index + 1}: opção ${value + 1}`),
    }));

    return NextResponse.json({ leads: data });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os leads." }, { status: 500 });
  }
}
