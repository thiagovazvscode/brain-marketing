// Tipos compartilhados entre o servidor (queries) e os componentes do módulo
// Métodos & Execução (specs/metodos-execucao).

export interface SimpleOption {
  id: string;
  name: string;
}

export interface MethodSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  category: string | null;
  status: string;
  version: string;
  authorId: string | null;
  authorName: string | null;
  updatedAt: string;
  createdAt: string;
  productNames: string[];
  playbookCount: number;
}

export interface MethodStageRow {
  id: string;
  name: string;
  sortOrder: number;
  objective: string | null;
  description: string | null;
  expectedResult: string | null;
  successCriteria: string | null;
}

export interface VersionLogRow {
  id: string;
  versionLabel: string;
  status: string;
  changeNote: string | null;
  authorId: string | null;
  createdAt: string;
}

export interface PlaybookLinkRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  type: string;
}

export interface MethodDetail {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: string | null;
  problemSolved: string | null;
  idealClientProfile: string | null;
  expectedResult: string | null;
  principles: string[];
  premises: string[];
  successIndicators: string[];
  risks: string[];
  status: string;
  version: string;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PlaybookSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  version: string;
  defaultDurationDays: number | null;
  methodId: string;
  methodName: string;
  productId: string;
  productName: string;
  authorId: string | null;
  authorName: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PlaybookDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  objective: string | null;
  methodId: string;
  productId: string;
  type: string;
  defaultDurationDays: number | null;
  prerequisites: string[];
  expectedResult: string | null;
  defaultResponsibles: string[];
  requiredDocuments: string[];
  deliverables: string[];
  successCriteria: string[];
  status: string;
  version: string;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  currentVersionId: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ResourceRow {
  id: string;
  title: string;
  type: string;
  url: string | null;
  description: string | null;
  methodId: string | null;
  playbookId: string | null;
  updatedAt: string;
}

// ── Fase 2.1 — Construtor visual de playbooks ───────────────────────────

export interface PlaybookBlockRow {
  id: string;
  playbookVersionId: string;
  stageId: string;
  type: string;
  title: string;
  description: string | null;
  internalInstructions: string | null;
  position: number;
  assigneeType: string;
  defaultAssigneeRole: string | null;
  defaultAssigneeId: string | null;
  externalResponsibleRole: string | null;
  dueOffsetValue: number | null;
  dueOffsetUnit: string | null;
  dueOffsetAnchor: string | null;
  priority: string;
  isRequired: boolean;
  blocksStage: boolean;
  dependencyBlockId: string | null;
  expectedResult: string | null;
  completionCriteria: string | null;
  overdueAction: string | null;
  clientExpectedResponse: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookStageRow {
  id: string;
  playbookVersionId: string;
  name: string;
  objective: string | null;
  description: string | null;
  internalInstructions: string | null;
  position: number;
  durationValue: number | null;
  durationUnit: string | null;
  defaultAssigneeRole: string | null;
  isRequired: boolean;
  blocksNextStage: boolean;
  completionCriteria: string | null;
  expectedDeliverable: string | null;
  priority: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  blocks: PlaybookBlockRow[];
  configStatus: "completa" | "incompleta" | "alerta" | "sem_configuracao";
}

export interface PlaybookEditorVersion {
  id: string;
  versionLabel: string;
  status: string;
  createdAt: string;
}

export interface PlaybookEditorData {
  playbook: PlaybookDetail;
  method: SimpleOption | null;
  product: SimpleOption | null;
  version: PlaybookEditorVersion;
  stages: PlaybookStageRow[];
}

export interface ValidationIssue {
  severity: "critico" | "ajuste";
  scope: "playbook" | "etapa" | "bloco";
  stageId?: string;
  blockId?: string;
  message: string;
}

export interface PlaybookValidationResult {
  validStages: number;
  totalStages: number;
  validBlocks: number;
  totalBlocks: number;
  adjustmentsCount: number;
  canPublish: boolean;
  issues: ValidationIssue[];
}
