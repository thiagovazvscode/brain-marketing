import { renderToBuffer } from "@react-pdf/renderer";
import { getClientReport } from "@/lib/reports/query";
import { getCampaignComparison } from "@/lib/reports/comparison";
import { buildReportFilename } from "@/lib/reports/filename";
import { ReportDocument } from "@/lib/pdf/ReportDocument";
import { ComparisonDocument } from "@/lib/pdf/ComparisonDocument";
import type { PeriodPreset } from "@/lib/reports/period";

// @react-pdf/renderer usa APIs de Node (Buffer, fontkit) — precisa do
// runtime Node do Vercel, nunca Edge.
export const runtime = "nodejs";
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

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const { searchParams } = new URL(request.url);

  const presetParam = searchParams.get("period") || "last_30d";
  if (!VALID_PRESETS.has(presetParam as PeriodPreset)) return jsonError("Período inválido.", 400);
  const preset = presetParam as PeriodPreset;

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  if (preset === "custom" && (!from || !to)) return jsonError("Período personalizado exige from e to.", 400);

  const campaignIdA = searchParams.get("campaignIdA");
  const campaignIdB = searchParams.get("campaignIdB");

  try {
    if (campaignIdA && campaignIdB) {
      const comparisonResult = await getCampaignComparison(client, { preset, from, to }, campaignIdA, campaignIdB);
      if ("notFound" in comparisonResult) return jsonError("Cliente, conta ou campanhas não encontrados.", 404);
      if ("invalid" in comparisonResult) return jsonError(comparisonResult.message, 400);
      const comparison = comparisonResult;

      const generatedAt = new Date();
      const buffer = await renderToBuffer(<ComparisonDocument comparison={comparison} generatedAt={generatedAt} />);
      const filename = buildReportFilename({
        clientSlug: client,
        scopeLabel: comparison.a.name,
        scopeBLabel: comparison.b.name,
        since: comparison.period.since,
        until: comparison.period.until,
        kind: "comparativo",
      });

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const campaignId = searchParams.get("campaignId") || undefined;
    const adsetId = searchParams.get("adsetId") || undefined;
    const adId = searchParams.get("adId") || undefined;

    const report = await getClientReport(client, { preset, from, to }, { campaignId, adsetId, adId });
    if ("notFound" in report && report.notFound) return jsonError("Cliente não encontrado.", 404);
    if ("notConnected" in report && report.notConnected) return jsonError("Conexão com o Meta ainda não configurada.", 409);
    if ("noData" in report && report.noData) return jsonError("Nenhum dado sincronizado ainda para este cliente.", 409);

    const r = report as Exclude<typeof report, { notFound: true } | { notConnected: true } | { noData: true }>;

    const scopeLabel = adId
      ? r.ads.find((a) => a.id === adId)?.name ?? "Anúncio selecionado"
      : adsetId
        ? r.adsets.find((a) => a.id === adsetId)?.name ?? "Conjunto selecionado"
        : campaignId
          ? r.campaigns[0]?.name ?? "Campanha selecionada"
          : "Todas as campanhas";

    const generatedAt = new Date();
    const buffer = await renderToBuffer(<ReportDocument report={r} generatedAt={generatedAt} scopeLabel={scopeLabel} />);
    const filename = buildReportFilename({
      clientSlug: client,
      scopeLabel,
      since: r.period.since,
      until: r.period.until,
      kind: "relatorio",
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao gerar PDF.", 400);
  }
}
