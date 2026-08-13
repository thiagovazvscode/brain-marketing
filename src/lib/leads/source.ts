import type { LeadsAvailability } from "./types";

/**
 * Fonte dos registros individuais de lead — hoje sempre indisponível pra
 * qualquer cliente deste projeto. Auditado em 2026-08-13 (e reverificado ao
 * vivo antes desta implementação, via GET /me/permissions do Graph API): o
 * token Meta que alimenta o brain-marketing só tem `ads_read`,
 * `business_management`, `public_profile` — sem `leads_retrieval` não dá
 * pra listar formulários nem recuperar leadgen_id/field_data individuais, só
 * os agregados de Insights que já alimentam o dashboard e os KPIs.
 *
 * Também não existe, ainda, nenhuma tabela neste projeto pra guardar
 * registro individual de lead (metaInsightsDaily é 100% agregado). Ver
 * [[project-mv-imoveis-comparativo-exportacao]] na memória pro que falta
 * pra desbloquear isso de verdade.
 *
 * NUNCA fabricar LeadRecord[] a partir de contagem agregada — por isso esta
 * função sempre retorna `available:false` até essas duas peças existirem de
 * verdade. clientSlug/filters ficam na assinatura pra manter a interface
 * estável quando isso for implementado.
 */
export async function getLeadsForClient(
  clientSlug: string,
  filters: { campaignIds: string[]; since: string; until: string }
): Promise<LeadsAvailability> {
  void clientSlug;
  void filters;
  return {
    available: false,
    reason:
      "A exportação de leads individuais ainda não está disponível para esta conta — falta permissão da Meta e uma tabela própria de registros.",
    missing: [
      "Autorização Meta com escopo leads_retrieval (+ pages_show_list, pages_read_engagement) para a conta da MV Imóveis — a conexão atual só tem ads_read.",
      "Confirmar Page do Facebook que roda os Lead Ads da MV Imóveis e vincular essa autorização a ela.",
      "Aprovação de App Review da Meta para leads_retrieval em produção (permissão Standard Access).",
      "Tabela nova no banco do brain-marketing para registros individuais de lead (leadgen_id, form_id, form_name, campos de resposta) — hoje só existe o agregado diário de Insights.",
    ],
  };
}
