import { NextResponse } from "next/server";
import { and, count, gte } from "drizzle-orm";
import { db } from "@/db";
import { quizSessions } from "@/db/schema";
import { getPeriodStart } from "@/lib/analytics-period";

const STEPS = [1, 2, 3, 4, 5];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const since = getPeriodStart(period);

  try {
    const funnel = await Promise.all(
      STEPS.map(async (step) => {
        const [{ total }] = await db
          .select({ total: count() })
          .from(quizSessions)
          .where(and(gte(quizSessions.startedAt, since), gte(quizSessions.lastStep, step)));
        return { step, reached: total };
      })
    );

    return NextResponse.json({ funnel });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o funil do quiz." }, { status: 500 });
  }
}
