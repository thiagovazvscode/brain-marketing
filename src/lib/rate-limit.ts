import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";

const WINDOW_MS = 60_000;

/**
 * Nunca lança — se o banco estiver fora do ar, deixa passar (rate limit é uma
 * mitigação, não pode ser o motivo de um visitante real ficar bloqueado).
 */
export async function isRateLimited(ip: string, endpoint: string, limit = 60): Promise<boolean> {
  try {
    const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);

    const [existing] = await db
      .select()
      .from(rateLimitHits)
      .where(
        and(
          eq(rateLimitHits.ip, ip),
          eq(rateLimitHits.endpoint, endpoint),
          eq(rateLimitHits.windowStart, windowStart)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(rateLimitHits).values({ ip, endpoint, windowStart, count: 1 });
      return false;
    }

    if (existing.count >= limit) return true;

    await db
      .update(rateLimitHits)
      .set({ count: existing.count + 1 })
      .where(eq(rateLimitHits.id, existing.id));
    return false;
  } catch {
    return false;
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
