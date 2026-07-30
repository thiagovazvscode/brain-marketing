import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import type { LeadSource } from "@/types/tracking";

const VALID_SOURCES: LeadSource[] = ["banner", "quiz-cta", "homepage-contact"];

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (await isRateLimited(ip, "leads", 20)) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const sourceType = body.sourceType as LeadSource;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (name.length < 2 || phone.length < 8 || !VALID_SOURCES.includes(sourceType) || !sessionId) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes ou inválidos." }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(leads)
      .values({
        name,
        phone,
        email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
        sourceType,
        sourceElementId: typeof body.sourceElementId === "string" ? body.sourceElementId : null,
        service: typeof body.service === "string" ? body.service : null,
        quizSessionId: typeof body.quizSessionId === "string" ? body.quizSessionId : null,
        sessionId,
        utmSource: typeof body.utmSource === "string" ? body.utmSource : null,
        utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : null,
        utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : null,
        utmTerm: typeof body.utmTerm === "string" ? body.utmTerm : null,
        utmContent: typeof body.utmContent === "string" ? body.utmContent : null,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : null,
      })
      .returning({ id: leads.id });

    return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o lead agora." }, { status: 500 });
  }
}
