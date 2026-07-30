import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews } from "@/db/schema";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// Tracking nunca pode quebrar a navegação do visitante: sempre 200, mesmo com
// payload malformado, banco fora do ar, ou rate limit estourado.
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(ip, "track/pageview")) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    if (typeof body?.path === "string" && typeof body?.sessionId === "string") {
      await db.insert(pageViews).values({
        path: body.path,
        sessionId: body.sessionId,
        referrer: typeof body.referrer === "string" ? body.referrer : null,
        utmSource: typeof body.utmSource === "string" ? body.utmSource : null,
        utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : null,
        utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : null,
        utmTerm: typeof body.utmTerm === "string" ? body.utmTerm : null,
        utmContent: typeof body.utmContent === "string" ? body.utmContent : null,
      });
    }
  } catch {
    // silencioso de propósito
  }

  return NextResponse.json({ ok: true });
}
