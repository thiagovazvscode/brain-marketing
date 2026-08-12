/**
 * Segundo teste manual — lista campanhas/conjuntos/anúncios/creatives da
 * conta de anúncios da MV Imóveis já confirmada manualmente
 * (act_1294043869320088). Server-side only, não persiste nada, não conecta
 * nada — só prova que o token consegue ler os dados reais.
 *
 * Rodar: dotenv -e .env.local -- tsx scripts/test-meta-campaigns.ts
 */

export {};

const GRAPH_VERSION = "v19.0";

// Confirmado manualmente pelo usuário — "Conta 2 - MV IMOVEIS - Agência".
const MV_IMOVEIS_AD_ACCOUNT_ID = "act_1294043869320088";

type MetaError = { error?: { message?: string } };

type Campaign = { id: string; name: string; objective?: string; status?: string };
type Adset = { id: string; name: string; campaign_id?: string; status?: string };
type Creative = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  object_type?: string;
  video_id?: string;
};
type Ad = { id: string; name: string; adset_id?: string; campaign_id?: string; status?: string; creative?: Creative };

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const data = (await res.json()) as T & MetaError;
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Erro HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.error("META_ACCESS_TOKEN não definido em .env.local.");
    process.exit(1);
  }

  console.log(`Conta: ${MV_IMOVEIS_AD_ACCOUNT_ID}\n`);

  console.log("== CAMPAIGNS ==");
  const campaigns = await graphGet<{ data?: Campaign[] }>(`${MV_IMOVEIS_AD_ACCOUNT_ID}/campaigns`, token, {
    fields: "id,name,objective,status",
    limit: "100",
  });
  for (const c of campaigns.data ?? []) {
    console.log(`  - ${c.name}  |  campaign_id: ${c.id}  |  objective: ${c.objective}  |  status: ${c.status}`);
  }
  if (!campaigns.data?.length) console.log("  (nenhuma campanha encontrada)");

  console.log("\n== ADSETS ==");
  const adsets = await graphGet<{ data?: Adset[] }>(`${MV_IMOVEIS_AD_ACCOUNT_ID}/adsets`, token, {
    fields: "id,name,campaign_id,status",
    limit: "100",
  });
  for (const a of adsets.data ?? []) {
    console.log(`  - ${a.name}  |  adset_id: ${a.id}  |  campaign_id: ${a.campaign_id}  |  status: ${a.status}`);
  }
  if (!adsets.data?.length) console.log("  (nenhum conjunto encontrado)");

  console.log("\n== ADS + CREATIVE ==");
  const ads = await graphGet<{ data?: Ad[] }>(`${MV_IMOVEIS_AD_ACCOUNT_ID}/ads`, token, {
    fields: "id,name,adset_id,campaign_id,status,creative{id,thumbnail_url,image_url,object_type,video_id}",
    limit: "100",
  });
  for (const ad of ads.data ?? []) {
    const thumb = ad.creative?.thumbnail_url || ad.creative?.image_url || "(sem thumbnail retornado)";
    console.log(
      `  - ${ad.name}  |  ad_id: ${ad.id}  |  adset_id: ${ad.adset_id}  |  campaign_id: ${ad.campaign_id}  |  status: ${ad.status}`
    );
    console.log(
      `      creative_id: ${ad.creative?.id || "—"}  |  tipo: ${ad.creative?.object_type || "—"}  |  thumbnail: ${thumb}`
    );
  }
  if (!ads.data?.length) console.log("  (nenhum anúncio encontrado)");

  console.log("\n== Fim. Nada foi persistido ou conectado. ==");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha no teste de campanhas/anúncios:", error.message);
  process.exit(1);
});
