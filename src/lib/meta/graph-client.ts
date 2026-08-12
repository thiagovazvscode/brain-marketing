// Client mínimo da Marketing API do Meta — server-only. Nenhuma função aqui
// deve ser chamada de um client component nem de uma rota que responde
// direto pro browser sem passar por processamento server-side antes.

const GRAPH_VERSION = "v19.0";

type MetaError = { error?: { message?: string; code?: number; type?: string } };

// Códigos documentados pela Meta como limite de taxa/transitório — únicos
// que valem retry. Erros de auth/permissão (ex.: 190 = token inválido) NUNCA
// entram aqui: tentar de novo não resolve e só esconde o problema real.
const RETRYABLE_META_CODES = new Set([1, 2, 4, 17, 32, 613]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type GraphCampaign = {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  created_time?: string;
  updated_time?: string;
};

export type GraphAdset = {
  id: string;
  name: string;
  campaign_id?: string;
  status?: string;
};

export type GraphCreative = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  object_type?: string;
  video_id?: string;
};

export type GraphAd = {
  id: string;
  name: string;
  adset_id?: string;
  campaign_id?: string;
  status?: string;
  creative?: GraphCreative;
};

export type GraphInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  inline_link_clicks?: string;
  ctr?: string;
  inline_link_click_ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  date_start?: string;
  date_stop?: string;
};

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("access_token", token);

  let lastError: Error = new Error("Erro desconhecido ao consultar Meta");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url.toString());
    } catch (networkErr) {
      // Falha de rede (fetch nem completou) — sempre transitória, sempre elegível a retry.
      lastError = networkErr instanceof Error ? networkErr : new Error("Falha de rede ao consultar Meta");
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    const data = (await res.json()) as T & MetaError;
    if (res.ok && !data.error) return data;

    const code = data.error?.code;
    const retryable = RETRYABLE_META_CODES.has(code ?? -1) || res.status >= 500;
    lastError = new Error(data.error?.message || `Erro HTTP ${res.status}`);

    if (!retryable || attempt === MAX_RETRIES) throw lastError;
    await sleep(BASE_DELAY_MS * 2 ** attempt);
  }

  throw lastError;
}

export async function fetchMe(token: string) {
  return graphGet<{ id: string; name: string }>("me", token, { fields: "id,name" });
}

export type AdAccountDetails = {
  id: string;
  name: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
};

export async function fetchAdAccountDetails(adAccountExternalId: string, token: string): Promise<AdAccountDetails> {
  return graphGet<AdAccountDetails>(adAccountExternalId, token, {
    fields: "id,name,currency,timezone_name,account_status",
  });
}

export async function fetchTokenExpiry(token: string): Promise<Date | null> {
  try {
    const data = await graphGet<{ data?: { expires_at?: number } }>("debug_token", token, { input_token: token });
    const expiresAt = data.data?.expires_at;
    if (!expiresAt) return null; // 0/ausente = token de vida longa/sem expiração conhecida
    return new Date(expiresAt * 1000);
  } catch {
    return null;
  }
}

export async function fetchCampaigns(adAccountExternalId: string, token: string) {
  const data = await graphGet<{ data?: GraphCampaign[] }>(`${adAccountExternalId}/campaigns`, token, {
    fields: "id,name,objective,status,created_time,updated_time",
    limit: "200",
  });
  return data.data ?? [];
}

export async function fetchAdsets(adAccountExternalId: string, token: string) {
  const data = await graphGet<{ data?: GraphAdset[] }>(`${adAccountExternalId}/adsets`, token, {
    fields: "id,name,campaign_id,status",
    limit: "200",
  });
  return data.data ?? [];
}

export async function fetchAds(adAccountExternalId: string, token: string) {
  const data = await graphGet<{ data?: GraphAd[] }>(`${adAccountExternalId}/ads`, token, {
    fields: "id,name,adset_id,campaign_id,status,creative{id,thumbnail_url,image_url,object_type,video_id}",
    limit: "200",
  });
  return data.data ?? [];
}

const INSIGHT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "inline_link_clicks",
  "ctr",
  "inline_link_click_ctr",
  "cpc",
  "cpm",
  "actions",
  "cost_per_action_type",
].join(",");

/**
 * Descobre a data mais antiga com dado real disponível pra essa conta
 * (date_preset=maximum, nível campanha, 1 campo só). Usado pra delimitar o
 * backfill sem inventar um "desde sempre" arbitrário.
 */
export async function fetchEarliestAvailableDate(adAccountExternalId: string, token: string): Promise<string | null> {
  const data = await graphGet<{ data?: { date_start: string }[] }>(`${adAccountExternalId}/insights`, token, {
    level: "campaign",
    fields: "date_start",
    date_preset: "maximum",
    time_increment: "1",
    limit: "500",
  });
  const dates = (data.data ?? []).map((r) => r.date_start).filter(Boolean).sort();
  return dates[0] ?? null;
}

export async function fetchInsightsDaily(
  adAccountExternalId: string,
  token: string,
  level: "campaign" | "adset" | "ad",
  since: string,
  until: string
) {
  const data = await graphGet<{ data?: GraphInsightRow[] }>(`${adAccountExternalId}/insights`, token, {
    fields: INSIGHT_FIELDS,
    level,
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
  });
  return data.data ?? [];
}
