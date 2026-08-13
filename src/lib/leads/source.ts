import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, metaLeads, metaCampaigns, metaAdsets, metaAds } from "@/db/schema";
import type { LeadRecord, LeadsAvailability } from "./types";

// Nomes de campo padrão do Meta Lead Ads (pt/en, formulários variam) — tudo
// que não é isso vira "pergunta customizada" na exportação (renda, cidade,
// interesse...), nunca assumindo que todo formulário tem as mesmas.
const STANDARD_FIELD_NAMES = new Set(["full_name", "nome", "phone_number", "telefone", "email"]);

/**
 * Fonte dos registros individuais de lead — lê direto de meta_leads
 * (populado por src/lib/meta/leads-sync.ts), nunca deriva/estima a partir de
 * metaInsightsDaily (agregado). client_id sempre resolvido a partir do slug
 * e usado em toda a query — nunca mistura leads entre clientes.
 */
export async function getLeadsForClient(
  clientSlug: string,
  filters: { campaignIds: string[]; since: string; until: string }
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

  const leads: LeadRecord[] = rows.map((r) => {
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

  return { available: true, leads };
}
