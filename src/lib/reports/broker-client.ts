import { createHmac } from "crypto";

// Server-only: assina e chama o endpoint de servico do BrokerApps
// (/api/service/reports/meta-insights). O BrokerApps e' a unica fonte de
// verdade pra auth/token/conta do Meta — este arquivo nunca guarda nem ve
// um token do Meta, so repassa uma chamada assinada com um segredo interno
// entre os dois projetos. NUNCA importar isso de um client component.
if (typeof window !== "undefined") {
  throw new Error("lib/reports/broker-client.ts e' server-only e nao pode rodar no browser.");
}

export type InsightPeriod =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "maximum"
  | { from: string; to: string };

export type BrokerMetaCampaign = Record<string, unknown> & {
  campaignId: string;
  campaignName: string;
};

export type BrokerMetaAdset = Record<string, unknown> & {
  campaignId: string;
  adsetId: string;
};

export type BrokerMetaAd = Record<string, unknown> & {
  campaignId: string;
  adId: string;
  thumbnailUrl?: string;
};

export type BrokerTrendPoint = {
  date: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  leads: number;
  cpl: number;
};

export type BrokerReportResponse = {
  tenantSlug: string;
  adAccountId: string;
  period: InsightPeriod;
  campaigns: BrokerMetaCampaign[];
  adsets: BrokerMetaAdset[];
  ads: BrokerMetaAd[];
  trend: BrokerTrendPoint[];
  stale: boolean;
  asOf?: string;
  generatedAt: string;
};

export type BrokerReportError = {
  error: string;
};

function signRequest(secret: string, timestamp: string, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

export async function fetchMetaInsightsReport(params: {
  tenantSlug: string;
  period: InsightPeriod;
  campaignId?: string;
}): Promise<{ ok: true; data: BrokerReportResponse } | { ok: false; status: number; error: string }> {
  const baseUrl = process.env.BROKERAPPS_SERVICE_URL;
  const secret = process.env.BROKERAPPS_SERVICE_SECRET;

  if (!baseUrl || !secret) {
    return { ok: false, status: 500, error: "BROKERAPPS_SERVICE_URL/BROKERAPPS_SERVICE_SECRET nao configurados." };
  }

  const rawBody = JSON.stringify(params);
  const timestamp = String(Date.now());
  const signature = signRequest(secret, timestamp, rawBody);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/service/reports/meta-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, status: 502, error: err instanceof Error ? err.message : "Erro de rede ao chamar o BrokerApps." };
  }

  const json = (await response.json().catch(() => null)) as BrokerReportResponse | BrokerReportError | null;

  if (!response.ok || !json || "error" in json) {
    return {
      ok: false,
      status: response.status,
      error: (json && "error" in json && json.error) || `Erro HTTP ${response.status}`,
    };
  }

  return { ok: true, data: json };
}
