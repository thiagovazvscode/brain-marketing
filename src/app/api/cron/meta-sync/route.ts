import { NextResponse } from "next/server";
import { syncAllActiveClients } from "@/lib/meta/sync-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Endpoint do cron — protegido por CRON_SECRET (mesmo padrão oficial da
 * Vercel: Authorization: Bearer $CRON_SECRET). Sincroniza TODOS os clientes
 * com integração Meta, nunca um específico — genérico por construção.
 *
 * Configurado em vercel.json mas a AGENDA NÃO ESTÁ ATIVA ainda (aguardando
 * aprovação pra dar push/deploy — ver Fase 6, item "não ativar agenda").
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const results = await syncAllActiveClients("cron");

  return NextResponse.json({
    syncedClients: results.length,
    results: results.map((r) => ({
      clientSlug: r.clientSlug,
      status: r.result.status,
      campaignsSynced: r.result.campaignsSynced,
      adsetsSynced: r.result.adsetsSynced,
      adsSynced: r.result.adsSynced,
      insightsSynced: r.result.insightsSynced,
      errorMessage: r.result.errorMessage,
    })),
  });
}
