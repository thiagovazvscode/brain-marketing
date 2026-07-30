export type LeadSource = "banner" | "quiz-cta" | "homepage-contact";
export type LeadStatus = "novo" | "contatado" | "fechado" | "perdido";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  sourceType: LeadSource;
  sourceElementId?: string;
  service?: string;
  quizAnswers?: string[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  status: LeadStatus;
  createdAt: string;
}

export interface PageViewStat {
  path: string;
  label: string;
  count: number;
}

export interface ClickStat {
  elementId: string;
  label: string;
  count: number;
}

export interface QuizFunnelStep {
  step: number;
  label: string;
  reached: number;
}

export interface AnalyticsPeriodData {
  pageViews: PageViewStat[];
  clicks: ClickStat[];
  leadsCount: number;
  quizCompletionRate: number;
  quizFunnel: QuizFunnelStep[];
}

export type AnalyticsPeriod = "hoje" | "7d" | "30d";

export type PixelProvider = "meta" | "ga4";

export interface PixelConfig {
  id: string;
  pagePath: string;
  provider: PixelProvider;
  pixelId: string;
  enabled: boolean;
}
