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

// ── Fase 2.2A — Reunião, Checklist, Formulário/Briefing, Documento ─────────
// metadata (Reunião/Documento) fica tipado aqui só pro frontend; validação
// de verdade acontece no servidor (lib/methods.ts), nunca confiando só nesse
// tipo — ele documenta o shape, não garante nada em runtime.

export interface MeetingBlockMetadata {
  objective?: string;
  meetingType?: string;
  durationValue?: number | null;
  durationUnit?: string;
  format?: string;
  internalParticipantRoles?: string[];
  clientParticipants?: string[];
  participantsRequired?: boolean;
  mainContactRole?: string;
  prerequisites?: string[];
  requiredDocuments?: string[];
  agenda?: string[];
  keyQuestions?: string[];
  materialsToSend?: string[];
  recordRequired?: boolean;
  requiresMinutes?: boolean;
  expectedDecision?: string;
  associatedDeliverable?: string;
  notes?: string;
  rescheduleTolerance?: string;
}

export interface DocumentBlockMetadata {
  documentKind?: string;
  origin?: string;
  category?: string;
  templateFileNote?: string;
  resourceId?: string | null;
  acceptedFormats?: string[];
  requiresApproval?: boolean;
  visibility?: string;
}

export interface FormBlockMetadata {
  introduction?: string;
  respondentInstructions?: string;
  respondentType?: string;
  respondentRole?: string;
}

export interface FormQuestionValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  allowedFormats?: string[];
}

// ── Fase 2.2B.1 — Análise ───────────────────────────────────────────────
// Fonte vinculada dentro de metadata.sources (array — não tabela própria,
// mesmo raciocínio de agenda/prerequisites da Reunião: sem ID/edição/
// reordenação independentes fora do bloco, "posição" é o índice no array).
export interface AnalysisSourceLink {
  // Tipo do vínculo — blocos existentes do playbook (referenciados por
  // sourceBlockId) ou fontes fora do modelo (recurso da biblioteca por
  // resourceId, ou texto livre em "personalizada").
  type: "meeting" | "checklist" | "form_briefing" | "document" | "internal_task" | "client_request" | "resource" | "personalizada";
  sourceBlockId?: string | null;
  resourceId?: string | null;
  label: string;
  required: boolean;
  purpose?: string;
}

export interface AnalysisBlockMetadata {
  analysisType?: string;
  objective?: string;
  method?: string;
  analyzedPeriod?: string;
  requiresEvidence?: boolean;
  useWeights?: boolean;
  scoringSystem?: string;
  methodologyNotes?: string;
  collaborators?: string[];
  sources?: AnalysisSourceLink[];
  synthesisRequired?: boolean;
  recommendationsRequired?: boolean;
  mainProblems?: string[];
  strengths?: string[];
  risks?: string[];
  opportunities?: string[];
  recommendations?: string[];
  priorities?: string[];
  attachedEvidence?: string[];
  relatedDeliverable?: string;
  finalNotes?: string;
  allowPartialAnalysis?: boolean;
  requiresInternalReview?: boolean;
}

export interface PlaybookAnalysisCriterionRow {
  id: string;
  dimensionId: string;
  name: string;
  description: string | null;
  evaluationType: string;
  weight: number | null;
  isRequired: boolean;
  requiresEvidence: boolean;
  evidenceDescription: string | null;
  guidance: string | null;
  options: string[];
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookAnalysisDimensionRow {
  id: string;
  blockId: string;
  name: string;
  description: string | null;
  weight: number | null;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  criteria: PlaybookAnalysisCriterionRow[];
}

export interface PlaybookChecklistItemRow {
  id: string;
  blockId: string;
  title: string;
  description: string | null;
  groupName: string | null;
  position: number;
  isRequired: boolean;
  requiresEvidence: boolean;
  allowsNotes: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookFormQuestionRow {
  id: string;
  blockId: string;
  label: string;
  helpText: string | null;
  questionType: string;
  placeholder: string | null;
  options: string[];
  // Shape real é FormQuestionValidation — cast pontual em quem lê.
  validation: Record<string, unknown> | null;
  sectionName: string | null;
  position: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  // Shape real é MeetingBlockMetadata | DocumentBlockMetadata | FormBlockMetadata
  // conforme block.type — quem lê faz o cast pontual (metadata as MeetingBlockMetadata).
  metadata: Record<string, unknown> | null;
  tags: string[];
  checklistItems: PlaybookChecklistItemRow[];
  formQuestions: PlaybookFormQuestionRow[];
  analysisDimensions: PlaybookAnalysisDimensionRow[];
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

export interface PlaybookResourceOption {
  id: string;
  title: string;
  type: string;
}

export interface PlaybookEditorData {
  playbook: PlaybookDetail;
  method: SimpleOption | null;
  product: SimpleOption | null;
  version: PlaybookEditorVersion;
  stages: PlaybookStageRow[];
  resources: PlaybookResourceOption[];
}

export interface ValidationIssue {
  severity: "critico" | "ajuste";
  scope: "playbook" | "etapa" | "bloco";
  stageId?: string;
  blockId?: string;
  // Só para problemas de dimensão/critério de um bloco Análise — usados
  // junto com blockId/field/code/severity na chave de dedup e na
  // navegação (expandir a dimensão/critério certo ao clicar no problema).
  dimensionId?: string;
  criterionId?: string;
  message: string;
  // Chave estável (não a mensagem, que é texto livre) usada só pelo client
  // pra abrir a seção certa do painel e focar o campo problemático ao
  // clicar no problema na Validação — ver FIELD_SECTION_MAP em
  // PlaybookConfigPanel.tsx.
  field?: string;
  // Identificador estável da regra que gerou o problema — junto com
  // stageId/blockId/field/severity forma a chave conceitual usada pra
  // deduplicar problemas equivalentes (ex.: regra genérica de bloco vs.
  // regra específica do tipo dizendo a mesma coisa). Ver DUE_SPECIFIC_CODES
  // em validate/route.ts.
  code: string;
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
