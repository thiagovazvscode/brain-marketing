import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trackedLinks, linkClicks } from "@/db/schema";

// Rota pública de redirecionamento com tracking. Nunca pode travar o
// visitante: se o log do clique falhar, redireciona do mesmo jeito.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);

  try {
    const [link] = await db.select().from(trackedLinks).where(eq(trackedLinks.slug, slug)).limit(1);

    if (!link) {
      return NextResponse.redirect(new URL("/", request.url), 302);
    }

    const sessionId = crypto.randomUUID();

    try {
      await db.insert(linkClicks).values({
        linkId: link.id,
        sessionId,
        referrer: request.headers.get("referer") || null,
        utmSource: url.searchParams.get("utm_source"),
        utmMedium: url.searchParams.get("utm_medium"),
        utmCampaign: url.searchParams.get("utm_campaign") || link.campaign,
        userAgent: (request.headers.get("user-agent") || "").slice(0, 200),
      });
    } catch {
      // tracking nunca pode impedir o redirect
    }

    const destination = new URL(link.destinationUrl);
    // Propaga UTM já presentes na URL do link + o sessionId, pra dar
    // continuidade entre o clique e as page views que acontecem depois
    // (useTrackingSession adota "_bs" como sessionId se presente).
    url.searchParams.forEach((value, key) => {
      if (key.startsWith("utm_")) destination.searchParams.set(key, value);
    });
    destination.searchParams.set("_bs", sessionId);

    return NextResponse.redirect(destination.toString(), 302);
  } catch {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
}
