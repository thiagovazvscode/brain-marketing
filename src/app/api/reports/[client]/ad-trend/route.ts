import { NextResponse } from "next/server";
import { getAdDailyTrend } from "@/lib/reports/query";
import type { PeriodPreset } from "@/lib/reports/period";

export const dynamic = "force-dynamic";

const VALID_PRESETS = new Set<PeriodPreset>([
  "today",
  "yesterday",
  "last_7d",
  "last_14d",
  "last_30d",
  "this_month",
  "last_month",
  "since_start",
  "custom",
]);

function noStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const { searchParams } = new URL(request.url);

  const adId = searchParams.get("adId");
  if (!adId) return noStore({ error: "adId obrigatório." }, { status: 400 });

  const presetParam = searchParams.get("period") || "last_30d";
  if (!VALID_PRESETS.has(presetParam as PeriodPreset)) {
    return noStore({ error: "Período inválido." }, { status: 400 });
  }
  const preset = presetParam as PeriodPreset;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  try {
    const trend = await getAdDailyTrend(client, adId, { preset, from, to });
    if (trend === null) return noStore({ error: "Cliente ou conta não encontrados." }, { status: 404 });
    return noStore({ trend });
  } catch (err) {
    return noStore({ error: err instanceof Error ? err.message : "Erro ao carregar série do anúncio." }, { status: 400 });
  }
}
