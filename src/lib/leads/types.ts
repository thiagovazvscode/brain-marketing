// Um registro = uma submissão REAL de formulário Meta Lead Ads — nunca
// derivado/estimado a partir de contagem agregada de Insights (ver
// src/lib/leads/source.ts). customFields carrega as perguntas específicas
// de cada formulário (renda, faixa de entrada, interesse, cidade...) —
// nunca assume que todos os formulários têm as mesmas perguntas.
export type LeadRecord = {
  capturedAt: string; // ISO 8601
  name: string;
  phone: string;
  email: string | null;
  campaignId: string;
  campaignName: string;
  adsetName: string | null;
  adName: string | null;
  formName: string | null;
  customFields: Record<string, string>;
};

export type LeadsAvailability =
  | { available: true; leads: LeadRecord[] }
  | { available: false; reason: string; missing: string[] };
