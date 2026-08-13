import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getCampaignLeadsPreview } from "@/lib/reports/leads-preview";
import { getLeadsForClient } from "@/lib/leads/source";
import { buildLeadsWorkbook } from "@/lib/leads/workbook";
import { buildLeadsCsv } from "@/lib/leads/csv";
import { buildLeadsFilename } from "@/lib/reports/filename";

// exceljs usa APIs de Node — mesmo raciocínio do PDF (route.tsx).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const { searchParams } = new URL(request.url);

  const format = searchParams.get("format") ?? "preview";
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const campaignIds = (searchParams.get("campaignIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const variant = searchParams.get("variant") === "mailing" ? "mailing" : "completa";

  if (!since || !until) return jsonError("Informe o período (since/until).", 400);
  if (campaignIds.length === 0) return jsonError("Selecione ao menos uma campanha.", 400);

  if (format === "preview") {
    const preview = await getCampaignLeadsPreview(client, campaignIds, since, until);
    if (!preview) return jsonError("Cliente não encontrado.", 404);
    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
  }

  if (format !== "xlsx" && format !== "csv") return jsonError("Formato inválido.", 400);

  const [clientRow] = await db.select({ name: clients.name }).from(clients).where(eq(clients.slug, client)).limit(1);
  if (!clientRow) return jsonError("Cliente não encontrado.", 404);

  // Auditado: nenhuma conta deste projeto tem leads_retrieval nem tabela de
  // registro individual ainda — ver src/lib/leads/source.ts. Nunca gera
  // arquivo com dado fabricado; bloqueia com o motivo exato.
  const availability = await getLeadsForClient(client, { campaignIds, since, until });
  if (!availability.available) {
    return jsonError(availability.reason, 501, { missing: availability.missing });
  }

  // Código pronto pra quando availability.available === true — não
  // exercido hoje, mas mantido correto e completo (item 7 do pedido).
  const preview = await getCampaignLeadsPreview(client, campaignIds, since, until);
  const campaignNames = preview?.perCampaign.map((c) => c.name) ?? [];

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
}
