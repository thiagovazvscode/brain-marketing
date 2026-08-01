// Tipos compartilhados entre o servidor (queries) e os componentes do CRM.

export interface KanbanStage {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  stuckAfterDays: number;
  defaultProbability: number;
}

export interface KanbanOpportunity {
  id: string;
  title: string;
  contactName: string | null;
  companyName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  estimatedValue: string | null;
  probability: number;
  priority: "baixa" | "media" | "alta" | "urgente";
  status: "aberta" | "ganha" | "perdida";
  stageId: string;
  stageEnteredAt: string;
  nextAction: string | null;
  nextActionDate: string | null;
  expectedCloseDate: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  lostReason: string | null;
  productNames: string[];
}

export interface OpportunityActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  doneAt: string | null;
  createdAt: string;
}

export interface OpportunityProductRow {
  id: string;
  productId: string;
  productName: string;
  planName: string | null;
  estimatedValue: string | null;
}
