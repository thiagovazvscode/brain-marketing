import { NextResponse } from "next/server";
import { getCampaignComparison } from "@/lib/reports/comparison";
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

  const campaignIdA = searchParams.get("campaignIdA");
  const campaignIdB = searchParams.get("campaignIdB");
  if (!campaignIdA || !campaignIdB) {
    return noStore({ error: "Selecione duas campanhas (campaignIdA e campaignIdB)." }, { status: 400 });
  }

  try {
    const result = await getCampaignComparison(client, { preset, from, to }, campaignIdA, campaignIdB);

    if ("notFound" in result && result.notFound) {
      return noStore({ error: "Cliente, conta ou campanhas não encontrados." }, { status: 404 });
    }
    if ("invalid" in result && result.invalid) {
      return noStore({ error: result.message }, { status: 400 });
    }

    return noStore(result);
  } catch (err) {
    return noStore({ error: err instanceof Error ? err.message : "Erro ao comparar campanhas." }, { status: 400 });
  }
}
