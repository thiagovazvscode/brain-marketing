import { eq } from "drizzle-orm";
import { db } from "@/db";
import { metaConnections, metaAdAccounts, metaCampaigns, metaAdsets, metaAds, metaInsightsDaily } from "@/db/schema";
import { decryptToken } from "./crypto";
import { fetchCampaigns, fetchAdsets, fetchAds, fetchAdImagesByHash, fetchInsightsDaily, type GraphAd } from "./graph-client";
import { buildDailyMetrics } from "./metrics";

// Prioridade pra achar o hash do asset real por trás de um anúncio: criativo
// dinâmico (asset_feed_spec, o mais comum nesta conta) primeiro, depois os
// campos de post/link direto, por último o hash solto no creative.
function preferredImageHash(ad: GraphAd): string | undefined {
  const c = ad.creative;
  return (
    c?.asset_feed_spec?.images?.[0]?.hash ||
    c?.object_story_spec?.link_data?.image_hash ||
    c?.object_story_spec?.video_data?.image_hash ||
    c?.image_hash
  );
}

// Melhor mídia disponível pra exibir o anúncio, em ordem de preferência:
// asset original em resolução real (via /adimages) > image_url do creative >
// capa de vídeo do object_story_spec > thumbnail_url (sempre 64x64, borrado,
// último recurso). width/height só vêm preenchidos quando a Meta realmente
// informa — nunca inventados.
function resolveAdMedia(ad: GraphAd, imagesByHash: Map<string, { url: string; width?: number; height?: number }>) {
  const hash = preferredImageHash(ad);
  const resolved = hash ? imagesByHash.get(hash) : undefined;
  const previewUrl = resolved?.url || ad.creative?.image_url || ad.creative?.object_story_spec?.video_data?.image_url || null;
  return {
    previewUrl,
    mediaWidth: resolved?.width ?? null,
    mediaHeight: resolved?.height ?? null,
  };
}

async function loadConnectionAndAccount(clientId: string, adAccountId: string) {
  const [connection] = await db.select().from(metaConnections).where(eq(metaConnections.clientId, clientId)).limit(1);
  if (!connection) throw new Error(`Cliente ${clientId} não tem meta_connections.`);

  const [adAccount] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.id, adAccountId)).limit(1);
  if (!adAccount) throw new Error(`meta_ad_accounts ${adAccountId} não encontrada.`);

  return { token: decryptToken(connection.accessTokenEncrypted), adAccount };
}

/**
 * Sincroniza campanhas/conjuntos/anúncios (entidades, não insights) de um
 * cliente. Genérico — não sabe nada sobre "MV Imóveis" especificamente,
 * funciona pra qualquer clientId/adAccountId com uma connection válida.
 */
export async function syncClientEntities(clientId: string, adAccountId: string) {
  const { token, adAccount } = await loadConnectionAndAccount(clientId, adAccountId);

  const graphCampaigns = await fetchCampaigns(adAccount.externalId, token);
  const campaignIdByExternal = new Map<string, string>();
  for (const c of graphCampaigns) {
    const [row] = await db
      .insert(metaCampaigns)
      .values({
        clientId,
        adAccountId,
        externalId: c.id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        createdTime: c.created_time ? new Date(c.created_time) : null,
        updatedTime: c.updated_time ? new Date(c.updated_time) : null,
      })
      .onConflictDoUpdate({
        target: metaCampaigns.externalId,
        set: { name: c.name, objective: c.objective, status: c.status, updatedAt: new Date() },
      })
      .returning({ id: metaCampaigns.id, externalId: metaCampaigns.externalId });
    campaignIdByExternal.set(row.externalId, row.id);
  }

  const graphAdsets = await fetchAdsets(adAccount.externalId, token);
  const adsetIdByExternal = new Map<string, string>();
  for (const a of graphAdsets) {
    const campaignId = a.campaign_id ? campaignIdByExternal.get(a.campaign_id) : undefined;
    if (!campaignId) continue;
    const [row] = await db
      .insert(metaAdsets)
      .values({ clientId, campaignId, externalId: a.id, name: a.name, status: a.status })
      .onConflictDoUpdate({
        target: metaAdsets.externalId,
        set: { name: a.name, status: a.status, updatedAt: new Date() },
      })
      .returning({ id: metaAdsets.id, externalId: metaAdsets.externalId });
    adsetIdByExternal.set(row.externalId, row.id);
  }

  const graphAds = await fetchAds(adAccount.externalId, token);
  const imageHashes = graphAds.map(preferredImageHash).filter((h): h is string => Boolean(h));
  const imagesByHash = await fetchAdImagesByHash(adAccount.externalId, token, imageHashes);

  let adsUpserted = 0;
  for (const ad of graphAds) {
    const campaignId = ad.campaign_id ? campaignIdByExternal.get(ad.campaign_id) : undefined;
    const adsetId = ad.adset_id ? adsetIdByExternal.get(ad.adset_id) : undefined;
    if (!campaignId || !adsetId) continue;
    const thumbnailUrl = ad.creative?.thumbnail_url || ad.creative?.image_url;
    const media = resolveAdMedia(ad, imagesByHash);
    await db
      .insert(metaAds)
      .values({
        clientId,
        campaignId,
        adsetId,
        externalId: ad.id,
        creativeId: ad.creative?.id,
        name: ad.name,
        status: ad.status,
        mediaType: ad.creative?.object_type,
        thumbnailUrl,
        previewUrl: media.previewUrl,
        mediaWidth: media.mediaWidth,
        mediaHeight: media.mediaHeight,
      })
      .onConflictDoUpdate({
        target: metaAds.externalId,
        set: {
          name: ad.name,
          status: ad.status,
          creativeId: ad.creative?.id,
          mediaType: ad.creative?.object_type,
          thumbnailUrl,
          previewUrl: media.previewUrl,
          mediaWidth: media.mediaWidth,
          mediaHeight: media.mediaHeight,
          updatedAt: new Date(),
        },
      });
    adsUpserted++;
  }

  return { campaignsCount: campaignIdByExternal.size, adsetsCount: adsetIdByExternal.size, adsCount: adsUpserted };
}

/**
 * Backfill/atualização de insights diários (time_increment=1) pra um
 * cliente, nos 3 níveis. Idempotente: upsert por (clientId, level, entityId,
 * date) — rodar de novo pra mesma data só atualiza, nunca duplica.
 */
export async function syncInsightsDaily(clientId: string, adAccountId: string, since: string, until: string) {
  const { token, adAccount } = await loadConnectionAndAccount(clientId, adAccountId);

  let total = 0;
  for (const level of ["campaign", "adset", "ad"] as const) {
    const rows = await fetchInsightsDaily(adAccount.externalId, token, level, since, until);
    for (const row of rows) {
      const entityId = level === "campaign" ? row.campaign_id : level === "adset" ? row.adset_id : row.ad_id;
      if (!entityId || !row.date_start) continue;

      const metrics = buildDailyMetrics(row);
      await db
        .insert(metaInsightsDaily)
        .values({ clientId, adAccountId, level, entityId, date: row.date_start, metrics })
        .onConflictDoUpdate({
          target: [metaInsightsDaily.clientId, metaInsightsDaily.level, metaInsightsDaily.entityId, metaInsightsDaily.date],
          set: { metrics, fetchedAt: new Date() },
        });
      total++;
    }
  }
  return total;
}
