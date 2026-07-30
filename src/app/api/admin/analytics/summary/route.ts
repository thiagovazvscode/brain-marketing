import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { pageViews, clickEvents, leads, quizSessions } from "@/db/schema";
import { getPeriodStart } from "@/lib/analytics-period";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const utmCampaign = searchParams.get("utmCampaign");
  const since = getPeriodStart(period);

  try {
    const pvConditions = [gte(pageViews.createdAt, since)];
    if (utmCampaign) pvConditions.push(eq(pageViews.utmCampaign, utmCampaign));

    const pageViewRows = await db
      .select({ path: pageViews.path, total: count() })
      .from(pageViews)
      .where(and(...pvConditions))
      .groupBy(pageViews.path)
      .orderBy(desc(count()));

    const clickConditions = [gte(clickEvents.createdAt, since)];
    if (utmCampaign) clickConditions.push(eq(clickEvents.utmCampaign, utmCampaign));

    const clickRows = await db
      .select({ elementId: clickEvents.elementId, total: count() })
      .from(clickEvents)
      .where(and(...clickConditions))
      .groupBy(clickEvents.elementId)
      .orderBy(desc(count()));

    const leadConditions = [gte(leads.createdAt, since)];
    if (utmCampaign) leadConditions.push(eq(leads.utmCampaign, utmCampaign));
    const [{ total: leadsCount }] = await db
      .select({ total: count() })
      .from(leads)
      .where(and(...leadConditions));

    const [{ total: started }] = await db
      .select({ total: count() })
      .from(quizSessions)
      .where(gte(quizSessions.startedAt, since));

    const [{ total: completed }] = await db
      .select({ total: count() })
      .from(quizSessions)
      .where(and(gte(quizSessions.startedAt, since), isNotNull(quizSessions.completedAt)));

    return NextResponse.json({
      pageViews: pageViewRows.map((r) => ({ path: r.path, label: r.path, count: r.total })),
      clicks: clickRows.map((r) => ({ elementId: r.elementId, label: r.elementId, count: r.total })),
      leadsCount,
      quizCompletionRate: started > 0 ? completed / started : 0,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as métricas." }, { status: 500 });
  }
}
