import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizSessions } from "@/db/schema";

// Único endpoint para os 3 eventos do funil do quiz (start/step/complete) —
// tracking nunca deve quebrar a experiência do visitante, então sempre 200.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body?.event;

    if (event === "start") {
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
      if (!sessionId) return NextResponse.json({ ok: true });

      const [row] = await db.insert(quizSessions).values({ sessionId }).returning({ id: quizSessions.id });
      return NextResponse.json({ ok: true, quizSessionId: row.id });
    }

    if (event === "step") {
      const quizSessionId = body.quizSessionId;
      const step = body.step;
      const answerIndex = body.answerIndex;
      if (typeof quizSessionId !== "string" || typeof step !== "number") {
        return NextResponse.json({ ok: true });
      }

      const [existing] = await db.select().from(quizSessions).where(eq(quizSessions.id, quizSessionId)).limit(1);
      if (existing) {
        const nextAnswers = [...(existing.answers ?? []), answerIndex].filter(
          (value): value is number => typeof value === "number"
        );
        await db
          .update(quizSessions)
          .set({ lastStep: step, answers: nextAnswers })
          .where(eq(quizSessions.id, quizSessionId));
      }
      return NextResponse.json({ ok: true });
    }

    if (event === "complete") {
      const quizSessionId = body.quizSessionId;
      const resultService = body.resultService;
      if (typeof quizSessionId !== "string") return NextResponse.json({ ok: true });

      await db
        .update(quizSessions)
        .set({ completedAt: new Date(), resultService: typeof resultService === "string" ? resultService : null })
        .where(eq(quizSessions.id, quizSessionId));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
