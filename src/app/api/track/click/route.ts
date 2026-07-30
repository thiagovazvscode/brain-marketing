import { NextResponse } from "next/server";
import { db } from "@/db";
import { clickEvents } from "@/db/schema";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(ip, "track/click")) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    if (typeof body?.elementId === "string" && typeof body?.path === "string" && typeof body?.sessionId === "string") {
      await db.insert(clickEvents).values({
        elementId: body.elementId,
        path: body.path,
        sessionId: body.sessionId,
        utmSource: typeof body.utmSource === "string" ? body.utmSource : null,
        utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : null,
        utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : null,
      });
    }
  } catch {
    // silencioso de propósito
  }

  return NextResponse.json({ ok: true });
}
