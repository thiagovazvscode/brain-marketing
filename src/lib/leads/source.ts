import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaLeads, metaCampaigns, metaAdsets, metaAds } from "@/db/schema";
import type { LeadRecord, LeadsAvailability } from "./types";

// Nomes de campo padrão do Meta Lead Ads (pt/en, formulários variam) — tudo
// que não é isso vira "pergunta customizada" na exportação (renda, cidade,
// interesse...), nunca assumindo que todo formulário tem as mesmas.
const STANDARD_FIELD_NAMES = new Set(["full_name", "nome", "phone_number", "telefone", "email"]);

// Detecta a pergunta de renda por SUBSTRING, nunca por nome de campo fixo —
// os formulários da MV Imóveis já usam textos diferentes pra mesma pergunta
// ("qual_a_sua_renda_média_?" vs "qual_é_a_renda_familiar_mensal_da_sua_casa?"),
// e outros clientes podem usar outro texto ainda.
const INCOME_FIELD_PATTERN = /renda/i;

export type IncomeOption = { value: string; label: string; count: number };

// Corrige só a diferença de digitação real encontrada em produção
// ("cima_de_r$_12.000" vs "acima_de_r$_12.000") ANTES de agrupar/filtrar —
// senão as duas viram duas linhas de checkbox com o mesmo rótulo humanizado,
// mas desmarcar uma não afeta a outra (bug encontrado testando esse filtro).
// Nunca reclassifica faixas numericamente, só normaliza esse typo pontual.
function canonicalIncomeValue(raw: string): string {
  // \b não separa "cima" de "_de" (underscore conta como \w) — precisa do
  // literal "_" aqui, não \b, senão essa correção nunca dispara.
  return raw.trim().replace(/^cima_/i, "acima_");
}

function humanizeIncomeValue(canonical: string): string {
  return canonical
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/r\$\s*/gi, "R$ ")
    .replace(/^./, (c) => c.toUpperCase());
}

function getLeadIncomeValue(lead: LeadRecord): string | null {
  for (const [key, value] of Object.entries(lead.customFields)) {
    if (value && INCOME_FIELD_PATTERN.test(key)) return canonicalIncomeValue(value);
  }
  return null;
}

/** Faixas de renda disponíveis pro filtro de exportação — SEMPRE calculadas
 * sem aplicar o próprio filtro de renda, senão uma faixa desmarcada some da
 * lista de opções assim que o usuário desmarca ela. */
export function getIncomeOptions(leads: LeadRecord[]): IncomeOption[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const value = getLeadIncomeValue(lead);
    if (value === null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: humanizeIncomeValue(value), count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Fonte dos registros individuais de lead — lê direto de meta_leads
 * (populado por src/lib/meta/leads-sync.ts), nunca deriva/estima a partir de
 * metaInsightsDaily (agregado). client_id sempre resolvido a partir do slug
 * e usado em toda a query — nunca mistura leads entre clientes.
 */
export async function getLeadsForClient(
  clientSlug: string,
  filters: { campaignIds: string[]; since: string; until: string; incomeValues?: string[] }
): Promise<LeadsAvailability> {
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, clientSlug)).limit(1);
  if (!client) {
    return { available: false, reason: "Cliente não encontrado.", missing: [] };
  }
  if (filters.campaignIds.length === 0) return { available: true, leads: [] };

  const rows = await db
    .select()
    .from(metaLeads)
    .where(
      and(
        eq(metaLeads.clientId, client.id),
        inArray(metaLeads.campaignId, filters.campaignIds),
        gte(metaLeads.leadDateLocal, filters.since),
        lte(metaLeads.leadDateLocal, filters.until)
      )
    );

  const [campaignsMeta, adsetsMeta, adsMeta] = await Promise.all([
    db.select({ externalId: metaCampaigns.externalId, name: metaCampaigns.name }).from(metaCampaigns).where(eq(metaCampaigns.clientId, client.id)),
    db.select({ externalId: metaAdsets.externalId, name: metaAdsets.name }).from(metaAdsets).where(eq(metaAdsets.clientId, client.id)),
    db.select({ externalId: metaAds.externalId, name: metaAds.name }).from(metaAds).where(eq(metaAds.clientId, client.id)),
  ]);
  const campaignNameById = new Map(campaignsMeta.map((c) => [c.externalId, c.name]));
  const adsetNameById = new Map(adsetsMeta.map((a) => [a.externalId, a.name]));
  const adNameById = new Map(adsMeta.map((a) => [a.externalId, a.name]));

  let leads: LeadRecord[] = rows.map((r) => {
    const fieldData = (r.fieldData as { name: string; values?: string[] }[] | null) ?? [];
    const customFields: Record<string, string> = {};
    for (const f of fieldData) {
      if (STANDARD_FIELD_NAMES.has(f.name)) continue;
      customFields[f.name] = f.values?.[0] ?? "";
    }
    return {
      capturedAt: r.createdTime.toISOString(),
      name: r.name ?? "",
      phone: r.phone ?? "",
      email: r.email,
      campaignId: r.campaignId ?? "",
      campaignName: (r.campaignId && campaignNameById.get(r.campaignId)) || r.campaignId || "—",
      adsetName: (r.adsetId && adsetNameById.get(r.adsetId)) || r.adsetId || null,
      adName: (r.adId && adNameById.get(r.adId)) || r.adId || null,
      formName: r.formName,
      customFields,
    };
  });

  if (filters.incomeValues && filters.incomeValues.length > 0) {
    // Um lead sem pergunta de renda no formulário (income === null) NUNCA é
    // excluído por esse filtro — desmarcar uma faixa só tira quem RESPONDEU
    // aquela faixa, nunca quem não teve a pergunta (formulário diferente).
    const allowed = new Set(filters.incomeValues);
    leads = leads.filter((l) => {
      const income = getLeadIncomeValue(l);
      return income === null || allowed.has(income);
    });
  }

  return { available: true, leads };
}
