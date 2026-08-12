/**
 * Script de teste manual — valida o META_ACCESS_TOKEN colado em .env.local
 * e lista as contas de anúncio acessíveis por ele. Server-side only, não
 * conecta nem persiste nada — só imprime o que encontrou pra escolha manual.
 *
 * Rodar: dotenv -e .env.local -- tsx scripts/test-meta-connection.ts
 */

export {};

const GRAPH_VERSION = "v19.0";

type MetaError = { error?: { message?: string; type?: string; code?: number } };

type MeResponse = { id?: string; name?: string } & MetaError;

type AdAccount = {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
};

type Business = { id: string; name: string };

const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1: "Ativa",
  2: "Desativada",
  3: "Não liquidada",
  7: "Em revisão de risco",
  8: "Pendente de liquidação",
  9: "Em período de carência",
  100: "Pendente de fechamento",
  101: "Fechada",
};

function statusLabel(status?: number) {
  if (status === undefined) return "desconhecido";
  return ACCOUNT_STATUS_LABEL[status] || `status ${status}`;
}

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

function printAdAccounts(accounts: AdAccount[], source: string) {
  if (accounts.length === 0) {
    console.log(`  (nenhuma conta encontrada via ${source})`);
    return;
  }
  for (const acc of accounts) {
    console.log(
      `  - ${acc.name}  |  ad_account_id: ${acc.id}  |  status: ${statusLabel(acc.account_status)}  |  moeda: ${acc.currency || "—"}  |  timezone: ${acc.timezone_name || "—"}  |  via: ${source}`
    );
  }
}

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.error("META_ACCESS_TOKEN não definido em .env.local. Cole o token e rode de novo.");
    process.exit(1);
  }

  console.log("== A. Validando token (GET /me) ==");
  const me = await graphGet<MeResponse>("me", token, { fields: "id,name" });
  console.log(`Token válido. Usuário: ${me.name} (id: ${me.id})`);

  console.log("\n== B. Contas de anúncio diretas (GET /me/adaccounts) ==");
  const direct = await graphGet<{ data?: AdAccount[] }>("me/adaccounts", token, {
    fields: "id,name,account_status,currency,timezone_name",
    limit: "100",
  });
  printAdAccounts(direct.data ?? [], "acesso direto");

  const foundDirect = (direct.data ?? []).length > 0;

  console.log("\n== D. Businesses acessíveis (GET /me/businesses) ==");
  const businesses = await graphGet<{ data?: Business[] }>("me/businesses", token, {
    fields: "id,name",
    limit: "100",
  });

  if (!businesses.data || businesses.data.length === 0) {
    console.log("  (nenhum Business Manager encontrado com este token)");
  } else {
    for (const biz of businesses.data) {
      console.log(`\nBusiness: ${biz.name} (business_id: ${biz.id})`);

      const owned = await graphGet<{ data?: AdAccount[] }>(`${biz.id}/owned_ad_accounts`, token, {
        fields: "id,name,account_status,currency,timezone_name",
        limit: "100",
      }).catch((e) => {
        console.log(`  (erro em owned_ad_accounts: ${e.message})`);
        return { data: [] as AdAccount[] };
      });
      printAdAccounts(owned.data ?? [], "owned_ad_accounts");

      const client = await graphGet<{ data?: AdAccount[] }>(`${biz.id}/client_ad_accounts`, token, {
        fields: "id,name,account_status,currency,timezone_name",
        limit: "100",
      }).catch((e) => {
        console.log(`  (erro em client_ad_accounts: ${e.message})`);
        return { data: [] as AdAccount[] };
      });
      printAdAccounts(client.data ?? [], "client_ad_accounts");
    }
  }

  if (!foundDirect && (!businesses.data || businesses.data.length === 0)) {
    console.log("\nNenhuma conta de anúncios encontrada por nenhum caminho (direto ou via Business).");
  }

  console.log("\n== Fim. Nenhuma conta foi conectada — escolha manual pendente. ==");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha no teste de conexão Meta:", error.message);
  process.exit(1);
});
