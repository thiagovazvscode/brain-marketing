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

// MRR real de uma contratação: recorrente soma o valor negociado, pontual
// soma zero (impacta receita pontual, não recorrente). Guardado como coluna
// (impactOnMrr) em vez de calculado só em query, pra somas agregadas no
// dashboard não precisarem repetir esse CASE em todo lugar.
export function computeImpactOnMrr(billingType: "recorrente" | "pontual", negotiatedValue: number | string | null): number {
  if (billingType !== "recorrente") return 0;
  const value = typeof negotiatedValue === "string" ? parseFloat(negotiatedValue) : negotiatedValue;
  return value && !Number.isNaN(value) ? value : 0;
}
