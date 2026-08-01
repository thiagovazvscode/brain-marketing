// Status de onboarding/operação de uma contratação (client_products). Texto
// validado em app-level, não pgEnum — mesmo raciocínio de method-stages.ts:
// lista muda mais rápido do que justificaria uma migration de banco.

export const ONBOARDING_STATUSES = [
  { id: "nao-iniciado", label: "Não iniciado" },
  { id: "enviado", label: "Enviado ao cliente" },
  { id: "incompleto", label: "Incompleto" },
  { id: "concluido", label: "Concluído" },
] as const;

export type OnboardingStatusId = (typeof ONBOARDING_STATUSES)[number]["id"];

export const OPERATIONAL_STATUSES = [
  { id: "aguardando-inicio", label: "Aguardando início" },
  { id: "onboarding", label: "Onboarding" },
  { id: "em-implantacao", label: "Em implantação" },
  { id: "em-execucao", label: "Em execução" },
  { id: "aguardando-cliente", label: "Aguardando cliente" },
  { id: "bloqueado", label: "Bloqueado" },
  { id: "atrasado", label: "Atrasado" },
  { id: "concluido", label: "Concluído" },
  { id: "pausado", label: "Pausado" },
  { id: "cancelado", label: "Cancelado" },
] as const;

export type OperationalStatusId = (typeof OPERATIONAL_STATUSES)[number]["id"];

export function onboardingStatusLabel(id: string): string {
  return ONBOARDING_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function operationalStatusLabel(id: string): string {
  return OPERATIONAL_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function isValidOnboardingStatus(id: string): id is OnboardingStatusId {
  return ONBOARDING_STATUSES.some((s) => s.id === id);
}

export function isValidOperationalStatus(id: string): id is OperationalStatusId {
  return OPERATIONAL_STATUSES.some((s) => s.id === id);
}

export type BillingCycleId = "mensal" | "trimestral" | "semestral" | "anual" | "unico";

// Quantos meses cada ciclo cobre. MRR é receita MENSAL recorrente: um contrato
// anual de R$ 12.000 vale R$ 1.000 de MRR, não R$ 12.000. Ciclo "unico" não
// gera recorrência (0 meses = fora do MRR), mesmo que o tipo tenha sido
// marcado como recorrente por engano no cadastro.
const CYCLE_MONTHS: Record<BillingCycleId, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
  unico: 0,
};

function toNumber(input: number | string | null | undefined): number {
  if (input === null || input === undefined) return 0;
  const parsed = typeof input === "string" ? parseFloat(input) : input;
  return Number.isFinite(parsed) ? parsed : 0;
}

// MRR real de uma contratação: recorrente normaliza o valor negociado (menos
// desconto) para base mensal conforme o ciclo de cobrança; pontual soma zero
// (impacta receita pontual, não recorrente).
// Guardado como coluna (impactOnMrr) em vez de calculado só em query, pra
// somas agregadas no dashboard não precisarem repetir esse CASE em todo lugar.
export function computeImpactOnMrr(
  billingType: "recorrente" | "pontual",
  negotiatedValue: number | string | null,
  discount: number | string | null = null,
  billingCycle: BillingCycleId | string | null = "mensal"
): number {
  if (billingType !== "recorrente") return 0;

  const months = CYCLE_MONTHS[(billingCycle ?? "mensal") as BillingCycleId] ?? 1;
  if (months <= 0) return 0;

  const value = toNumber(negotiatedValue);
  if (value <= 0) return 0;

  const liquido = Math.max(0, value - toNumber(discount));
  // numeric(12,2) no banco — arredonda aqui pra evitar dízima virando string
  // com 15 casas e divergência entre o valor exibido e o somado.
  return Math.round((liquido / months) * 100) / 100;
}
