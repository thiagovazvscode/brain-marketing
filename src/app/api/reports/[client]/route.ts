import { NextResponse } from "next/server";
import { fetchMetaInsightsReport, type InsightPeriod } from "@/lib/reports/broker-client";
import { REPORT_CLIENTS } from "@/lib/reports/clients";

export const dynamic = "force-dynamic";

const VALID_PRESETS = new Set([
  "today",
  "yesterday",
  "last_7d",
  "last_14d",
  "last_30d",
  "this_month",
  "last_month",
  "maximum",
]);

function parsePeriod(searchParams: URLSearchParams): InsightPeriod | null {
  const period = searchParams.get("period") || "last_30d";

  if (period === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return null;
    return { from, to };
  }

  if (!VALID_PRESETS.has(period)) return null;
  return period as InsightPeriod;
}

export async function GET(request: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const config = REPORT_CLIENTS[client];

  if (!config) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams);
  if (!period) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }
  const campaignId = searchParams.get("campaignId") || undefined;

  const result = await fetchMetaInsightsReport({
    tenantSlug: config.tenantSlug,
    period,
    campaignId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { ...result.data, clientDisplayName: config.displayName },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
  );
}
