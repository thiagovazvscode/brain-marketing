import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getCampaignLeadsPreview } from "@/lib/reports/leads-preview";
import { getLeadsForClient, getIncomeOptions } from "@/lib/leads/source";
import { buildLeadsWorkbook } from "@/lib/leads/workbook";
import { buildLeadsCsv } from "@/lib/leads/csv";
import { buildLeadsFilename } from "@/lib/reports/filename";
import type { PeriodPreset } from "@/lib/reports/period";

// exceljs usa APIs de Node — mesmo raciocínio do PDF (route.tsx).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PRESETS = new Set<PeriodPreset>([
  "today",
  "yesterday",
  "last_7d",
  "last_14d",
  "last_15d",
  "last_30d",
  "this_month",
  "last_month",
  "since_start",
  "custom",
]);

// Mensagem única voltada pro cliente quando algo falha depois da validação
// de entrada — nunca expõe detalhe de infraestrutura (permissão Meta,
// tabela, etc.). O motivo técnico real vai só pro log do servidor.
const GENERIC_FAILURE_MESSAGE = "Não foi possível preparar a exportação neste momento. Tente novamente em alguns minutos.";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const { searchParams } = new URL(request.url);

  const format = searchParams.get("format") ?? "preview";
  const presetParam = searchParams.get("period") ?? "last_30d";
  if (!VALID_PRESETS.has(presetParam as PeriodPreset)) return jsonError("Período inválido.", 400);
  const preset = presetParam as PeriodPreset;

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  if (preset === "custom" && (!from || !to)) return jsonError("Período personalizado exige from e to.", 400);

  const campaignIds = (searchParams.get("campaignIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const variant = searchParams.get("variant") === "mailing" ? "mailing" : "completa";

  // Valores brutos de faixa de renda (ex.: "r$2.000_a_3.000_") vindos do
  // checkbox de filtro no modal — mesmo formato salvo em field_data, nunca
  // reclassificado numericamente (ver src/lib/leads/source.ts).
  const incomeValues = (searchParams.get("incomeValues") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (campaignIds.length === 0) return jsonError("Selecione ao menos uma campanha.", 400);

  try {
    // Período sempre resolvido aqui dentro (mesma função central do
    // dashboard, timezone real da conta) — since/until nunca chegam prontos
    // do chamador (item 4 do pedido de ajuste de período).
    const preview = await getCampaignLeadsPreview(client, campaignIds, { preset, from, to });
    if (!preview) return jsonError("Cliente não encontrado.", 404);
    const { since, until } = preview;

    if (format === "preview") {
      // Opções de renda sempre vêm do conjunto SEM filtro (senão uma faixa
      // desmarcada some da lista) — mas "N leads encontrados" precisa
      // refletir o filtro pra bater 1:1 com o que a exportação vai entregar.
      const fullAvailability = await getLeadsForClient(client, { campaignIds, since, until });
      if (!fullAvailability.available) {
        console.error(`[leads-export] preview indisponível pra ${client}: ${fullAvailability.reason}`, fullAvailability.missing);
        return jsonError(GENERIC_FAILURE_MESSAGE, 503);
      }
      const incomeOptions = getIncomeOptions(fullAvailability.leads);
      let totalLeads = fullAvailability.leads.length;
      if (incomeValues.length > 0) {
        const filteredAvailability = await getLeadsForClient(client, { campaignIds, since, until, incomeValues });
        totalLeads = filteredAvailability.available ? filteredAvailability.leads.length : 0;
      }

      return NextResponse.json(
        { since: preview.since, until: preview.until, perCampaign: preview.perCampaign, totalLeads, incomeOptions },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (format !== "xlsx" && format !== "csv") return jsonError("Formato inválido.", 400);

    const [clientRow] = await db.select({ name: clients.name }).from(clients).where(eq(clients.slug, client)).limit(1);
    if (!clientRow) return jsonError("Cliente não encontrado.", 404);

    const availability = await getLeadsForClient(client, { campaignIds, since, until, incomeValues });
    if (!availability.available) {
      // Detalhe técnico só no log do servidor — o cliente nunca vê isso
      // (item 4 do pedido: "cliente não deve ver detalhes de infraestrutura").
      console.error(`[leads-export] indisponível pra ${client}: ${availability.reason}`, availability.missing);
      return jsonError(GENERIC_FAILURE_MESSAGE, 503);
    }

    const campaignNames = preview.perCampaign.map((c) => c.name);

    if (availability.leads.length === 0) {
      return jsonError("Nenhum lead encontrado para os filtros selecionados.", 404);
    }

    if (format === "xlsx") {
      const buffer = await buildLeadsWorkbook({
        clientName: clientRow.name,
        since,
        until,
        campaignNames,
        leads: availability.leads,
      });
      const filename = buildLeadsFilename({ clientSlug: client, campaignNames, since, until, extension: "xlsx" });
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csv = buildLeadsCsv(availability.leads, variant);
    const filename = buildLeadsFilename({ clientSlug: client, campaignNames, since, until, extension: "csv" });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Idem — erro técnico real só no log do servidor.
    console.error(`[leads-export] falha inesperada pra ${client}:`, err instanceof Error ? err.message : err);
    return jsonError(GENERIC_FAILURE_MESSAGE, 500);
  }
}
