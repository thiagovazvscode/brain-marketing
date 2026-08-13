import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaAdAccounts, metaCampaigns, metaLeads } from "@/db/schema";
import { todayInTimeZone } from "@/lib/reports/period";

const GRAPH_API_VERSION = "v21.0";

type MetaLeadFieldDatum = { name: string; values?: string[] };
type MetaLeadApiRecord = {
  id: string;
  created_time: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  field_data?: MetaLeadFieldDatum[];
};
type LeadFormSummary = { id: string; name: string; leadsCount: number };

async function fetchJson(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`Graph API: ${json.error.message}`);
  return json;
}

/**
 * Troca o token do System User pelo Page Access Token — obrigatório pra
 * qualquer chamada de leadgen_forms/leads (a Meta rejeita com "This method
 * must be called with a Page Access Token" se usar o token do System User
 * direto). Nunca loga o valor do token.
 */
async function getPageAccessToken(pageId: string, systemUserToken: string): Promise<string> {
  const json = await fetchJson(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}?fields=access_token&access_token=${encodeURIComponent(systemUserToken)}`
  );
  if (!json.access_token) {
    throw new Error("Não foi possível obter o Page Access Token — verifique se o System User tem o ativo Page atribuído.");
  }
  return json.access_token as string;
}

async function listLeadForms(pageId: string, pageToken: string): Promise<LeadFormSummary[]> {
  const forms: LeadFormSummary[] = [];
  let url: string | null =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/leadgen_forms?fields=id,name,status,leads_count&limit=100&access_token=${encodeURIComponent(pageToken)}`;
  while (url) {
    const json: { data?: { id: string; name: string; leads_count?: number }[]; paging?: { next?: string } } = await fetchJson(url);
    for (const f of json.data ?? []) {
      forms.push({ id: f.id, name: f.name, leadsCount: Number(f.leads_count) || 0 });
    }
    url = json.paging?.next ?? null;
  }
  return forms;
}

async function fetchLeadsForForm(formId: string, pageToken: string, maxRecords: number): Promise<MetaLeadApiRecord[]> {
  const out: MetaLeadApiRecord[] = [];
  let url: string | null =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${formId}/leads?fields=id,created_time,campaign_id,adset_id,ad_id,field_data&limit=100&access_token=${encodeURIComponent(pageToken)}`;
  while (url && out.length < maxRecords) {
    const json: { data?: MetaLeadApiRecord[]; paging?: { next?: string } } = await fetchJson(url);
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }
  return out.slice(0, maxRecords);
}

function extractStandardFields(fieldData: MetaLeadFieldDatum[]) {
  const map = new Map(fieldData.map((f) => [f.name, f.values?.[0] ?? ""]));
  return {
    name: map.get("full_name") ?? map.get("nome") ?? null,
    phone: map.get("phone_number") ?? map.get("telefone") ?? null,
    email: map.get("email") ?? null,
  };
}

export type LeadsSyncResult = {
  formsScanned: number;
  leadsFetched: number;
  leadsUpserted: number;
  leadsSkippedOtherCampaign: number;
};

/**
 * Sincroniza leads REAIS de um cliente a partir da Page configurada em
 * meta_ad_accounts.page_id — nunca escreve nada fabricado/estimado.
 *
 * `maxRecordsPerForm` mantém o backfill controlado (item 10 do pedido de
 * habilitação): esta função nunca varre o histórico inteiro de um formulário
 * sem limite explícito.
 *
 * Todo lead cujo campaign_id não pertença às campanhas conhecidas DESTE
 * cliente é descartado (leadsSkippedOtherCampaign) — proteção multi-cliente
 * mesmo que a Page um dia seja reaproveitada por engano.
 */
export async function syncMetaLeadsForClient(
  clientSlug: string,
  options: { systemUserToken: string; maxRecordsPerForm?: number }
): Promise<LeadsSyncResult> {
  const maxRecordsPerForm = options.maxRecordsPerForm ?? 200;

  const [client] = await db.select().from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) throw new Error("Cliente não encontrado.");

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.clientId, client.id)).limit(1);
  if (!adAccount) throw new Error("Conta de anúncios não encontrada pra este cliente.");
  if (!adAccount.pageId) throw new Error("Page não configurada pra esta conta de anúncios (meta_ad_accounts.page_id).");

  const campaignsMeta = await db.select({ externalId: metaCampaigns.externalId }).from(metaCampaigns).where(eq(metaCampaigns.clientId, client.id));
  const knownCampaignIds = new Set(campaignsMeta.map((c) => c.externalId));

  const pageToken = await getPageAccessToken(adAccount.pageId, options.systemUserToken);
  const forms = await listLeadForms(adAccount.pageId, pageToken);

  let leadsFetched = 0;
  let leadsUpserted = 0;
  let leadsSkippedOtherCampaign = 0;
  let formsScanned = 0;

  for (const form of forms) {
    if (form.leadsCount === 0) continue;
    formsScanned++;
    const leads = await fetchLeadsForForm(form.id, pageToken, maxRecordsPerForm);
    leadsFetched += leads.length;

    for (const lead of leads) {
      if (lead.campaign_id && !knownCampaignIds.has(lead.campaign_id)) {
        leadsSkippedOtherCampaign++;
        continue;
      }

      const { name, phone, email } = extractStandardFields(lead.field_data ?? []);
      const leadDateLocal = todayInTimeZone(adAccount.timezoneName || "UTC", new Date(lead.created_time));

      await db
        .insert(metaLeads)
        .values({
          clientId: client.id,
          adAccountId: adAccount.id,
          pageId: adAccount.pageId,
          formId: form.id,
          formName: form.name,
          leadgenId: lead.id,
          campaignId: lead.campaign_id ?? null,
          adsetId: lead.adset_id ?? null,
          adId: lead.ad_id ?? null,
          createdTime: new Date(lead.created_time),
          leadDateLocal,
          name,
          phone,
          email,
          fieldData: lead.field_data ?? [],
        })
        .onConflictDoUpdate({
          target: [metaLeads.clientId, metaLeads.leadgenId],
          set: { fieldData: lead.field_data ?? [], name, phone, email, fetchedAt: new Date() },
        });
      leadsUpserted++;
    }
  }

  return { formsScanned, leadsFetched, leadsUpserted, leadsSkippedOtherCampaign };
}
