import { NextResponse } from "next/server";
import { getClientReport } from "@/lib/reports/query";
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

  const presetParam = searchParams.get("period") || "last_30d";
  if (!VALID_PRESETS.has(presetParam as PeriodPreset)) {
    return noStore({ error: "Período inválido." }, { status: 400 });
  }
  const preset = presetParam as PeriodPreset;

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  if (preset === "custom" && (!from || !to)) {
    return noStore({ error: "Período personalizado exige from e to." }, { status: 400 });
  }

  const campaignId = searchParams.get("campaignId") || undefined;
  const adsetId = searchParams.get("adsetId") || undefined;
  const adId = searchParams.get("adId") || undefined;

  try {
    const report = await getClientReport(client, { preset, from, to }, { campaignId, adsetId, adId });

    if ("notFound" in report && report.notFound) {
      return noStore({ error: "Cliente não encontrado." }, { status: 404 });
    }
    if ("notConnected" in report && report.notConnected) {
      return noStore({ error: "Conexão com o Meta ainda não configurada para este cliente.", client: report.client }, { status: 409 });
    }
    if ("noData" in report && report.noData) {
      return noStore({ error: "Nenhum dado sincronizado ainda para este cliente.", client: report.client, account: report.account }, { status: 409 });
    }

    return noStore(report);
  } catch (err) {
    return noStore({ error: err instanceof Error ? err.message : "Erro ao carregar relatório." }, { status: 400 });
  }
}
