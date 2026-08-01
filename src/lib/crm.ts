// Domínio do CRM Comercial (specs/crm-comercial).
//
// Origem, tipo de atividade e motivo de perda ficam aqui como listas validadas
// em app, não como pgEnum: são taxonomias que crescem com o negócio (uma origem
// nova por campanha, um motivo de perda novo a cada aprendizado comercial) e
// travar isso em enum de Postgres exigiria migration para cada valor. Mesmo
// raciocínio já aplicado em method-stages.ts e billing.ts.

export const OPPORTUNITY_SOURCES = [
  { id: "site", label: "Site / formulário" },
  { id: "hub", label: "Hub (link na bio)" },
  { id: "quiz", label: "Quiz do site" },
  { id: "instagram", label: "Instagram" },
  { id: "indicacao", label: "Indicação" },
  { id: "prospeccao-ativa", label: "Prospecção ativa" },
  { id: "anuncio", label: "Anúncio pago" },
  { id: "evento", label: "Evento / networking" },
  { id: "whatsapp", label: "WhatsApp direto" },
  { id: "outro", label: "Outro" },
] as const;

export type OpportunitySourceId = (typeof OPPORTUNITY_SOURCES)[number]["id"];

export const ACTIVITY_TYPES = [
  { id: "nota", label: "Anotação", icon: "note" },
  { id: "ligacao", label: "Ligação", icon: "phone" },
  { id: "whatsapp", label: "WhatsApp", icon: "message" },
  { id: "email", label: "E-mail", icon: "mail" },
  { id: "reuniao", label: "Reunião", icon: "calendar" },
  { id: "diagnostico", label: "Diagnóstico", icon: "search" },
  { id: "proposta", label: "Proposta enviada", icon: "file" },
  { id: "tarefa", label: "Tarefa", icon: "check" },
  { id: "mudanca-etapa", label: "Mudança de etapa", icon: "arrow" },
  { id: "venda", label: "Venda fechada", icon: "trophy" },
] as const;

export type ActivityTypeId = (typeof ACTIVITY_TYPES)[number]["id"];

export const LOSS_REASONS = [
  { id: "preco", label: "Preço acima do orçamento" },
  { id: "sem-budget", label: "Sem verba no momento" },
  { id: "concorrente", label: "Fechou com concorrente" },
  { id: "sem-resposta", label: "Parou de responder" },
  { id: "timing", label: "Momento inadequado" },
  { id: "nao-e-perfil", label: "Não é perfil de cliente" },
  { id: "fez-internamente", label: "Resolveu internamente" },
  { id: "outro", label: "Outro" },
] as const;

export type LossReasonId = (typeof LOSS_REASONS)[number]["id"];

export const OPPORTUNITY_PRIORITIES = [
  { id: "baixa", label: "Baixa" },
  { id: "media", label: "Média" },
  { id: "alta", label: "Alta" },
  { id: "urgente", label: "Urgente" },
] as const;

export const DOCUMENT_CATEGORIES = [
  { id: "proposta", label: "Proposta" },
  { id: "contrato", label: "Contrato" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "material", label: "Material de apoio" },
  { id: "outro", label: "Outro" },
] as const;

// ── Etapas padrão do funil (só para o seed inicial) ─────────────────────
//
// Isto NÃO é a fonte da verdade em runtime: as etapas vivem em
// pipeline_stages e são configuráveis. Esta constante existe apenas para
// popular o pipeline padrão na primeira execução.
//
// isWon/isLost são flags de comportamento, não nomes — renomear "Fechado"
// para "Ganho" não pode quebrar o fluxo de contratação.

export const DEFAULT_PIPELINE = {
  slug: "novos-negocios",
  name: "Novos negócios",
  description: "Funil comercial padrão da Brain, da captação ao fechamento.",
};

export const DEFAULT_STAGES = [
  { slug: "novo-lead", name: "Novo lead", sortOrder: 0, color: "#64748b", defaultProbability: 10, stuckAfterDays: 3 },
  { slug: "contato-realizado", name: "Contato realizado", sortOrder: 1, color: "#0ea5e9", defaultProbability: 25, stuckAfterDays: 5 },
  { slug: "diagnostico", name: "Diagnóstico", sortOrder: 2, color: "#6366f1", defaultProbability: 40, stuckAfterDays: 7 },
  { slug: "proposta-enviada", name: "Proposta enviada", sortOrder: 3, color: "#a855f7", defaultProbability: 60, stuckAfterDays: 7 },
  { slug: "negociacao", name: "Negociação", sortOrder: 4, color: "#f59e0b", defaultProbability: 80, stuckAfterDays: 10 },
  { slug: "fechado", name: "Fechado", sortOrder: 5, color: "#16a34a", defaultProbability: 100, stuckAfterDays: 365, isWon: true },
  { slug: "perdido", name: "Perdido", sortOrder: 6, color: "#dc2626", defaultProbability: 0, stuckAfterDays: 365, isLost: true },
] as const;

// ── Helpers ─────────────────────────────────────────────────────────────

function labelOf(list: readonly { id: string; label: string }[], id: string | null): string {
  if (!id) return "—";
  return list.find((item) => item.id === id)?.label ?? id;
}

export const sourceLabel = (id: string | null) => labelOf(OPPORTUNITY_SOURCES, id);
export const activityTypeLabel = (id: string | null) => labelOf(ACTIVITY_TYPES, id);
export const lossReasonLabel = (id: string | null) => labelOf(LOSS_REASONS, id);
export const priorityLabel = (id: string | null) => labelOf(OPPORTUNITY_PRIORITIES, id);
export const documentCategoryLabel = (id: string | null) => labelOf(DOCUMENT_CATEGORIES, id);

export const isValidSource = (id: string) => OPPORTUNITY_SOURCES.some((s) => s.id === id);
export const isValidActivityType = (id: string) => ACTIVITY_TYPES.some((s) => s.id === id);
export const isValidLossReason = (id: string) => LOSS_REASONS.some((s) => s.id === id);
export const isValidDocumentCategory = (id: string) => DOCUMENT_CATEGORIES.some((s) => s.id === id);

/**
 * Dias corridos que a oportunidade está na etapa atual.
 *
 * Calculado na leitura, nunca armazenado: um contador materializado ficaria
 * errado todo dia à meia-noite (é o mesmo defeito do impactOnMrr defasado que
 * a validação da Fase 1 encontrou).
 */
export function daysInStage(stageEnteredAt: Date | string): number {
  const entered = typeof stageEnteredAt === "string" ? new Date(stageEnteredAt) : stageEnteredAt;
  if (Number.isNaN(entered.getTime())) return 0;
  const diffMs = Date.now() - entered.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

/**
 * Oportunidade parada: passou do limite de dias definido NA ETAPA.
 * O limite é por etapa de propósito — negociação tolera mais tempo parada do
 * que "novo lead", então um limite global mentiria nos dois sentidos.
 * Etapas terminais (ganha/perdida) nunca alertam.
 */
export function isStuck(
  stageEnteredAt: Date | string,
  stuckAfterDays: number,
  status: "aberta" | "ganha" | "perdida" = "aberta"
): boolean {
  if (status !== "aberta") return false;
  return daysInStage(stageEnteredAt) > stuckAfterDays;
}

/** Valor ponderado pela probabilidade — base do forecast do funil. */
export function weightedValue(estimatedValue: string | number | null, probability: number): number {
  const value = typeof estimatedValue === "string" ? parseFloat(estimatedValue) : estimatedValue;
  if (!value || Number.isNaN(value)) return 0;
  const p = Math.max(0, Math.min(100, probability));
  return Math.round(value * (p / 100) * 100) / 100;
}

/** Slug único e legível a partir de um nome livre (para cliente criado na conversão). */
export function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
