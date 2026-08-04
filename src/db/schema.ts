import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum, date, numeric, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const leadStatusEnum = pgEnum("lead_status", ["novo", "contatado", "fechado", "perdido"]);
export const leadSourceEnum = pgEnum("lead_source", ["banner", "quiz-cta", "homepage-contact"]);
export const pixelProviderEnum = pgEnum("pixel_provider", ["meta", "ga4"]);

// Papel do usuário dentro do Brain OS — conjunto pequeno e estável o
// suficiente pra justificar enum (ao contrário de onboarding/operational
// status, que mudam com mais frequência e ficam como texto validado em app).
export const userRoleEnum = pgEnum("user_role", [
  "administrador",
  "comercial",
  "gestor",
  "atendimento",
  "financeiro",
  "colaborador",
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("administrador"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizSessions = pgTable("quiz_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  lastStep: integer("last_step").notNull().default(0),
  answers: jsonb("answers").$type<number[]>().notNull().default([]),
  resultService: text("result_service"),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  sourceType: leadSourceEnum("source_type").notNull(),
  sourceElementId: text("source_element_id"),
  service: text("service"),
  quizSessionId: uuid("quiz_session_id").references(() => quizSessions.id),
  sessionId: text("session_id").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  // Campos extras do Contact form (company, segment, investment, message) que a v1
  // ainda não modela como colunas próprias — ver specs/admin-crm-analytics/design.md.
  metadata: jsonb("metadata"),
  status: leadStatusEnum("status").notNull().default("novo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: text("path").notNull(),
  sessionId: text("session_id").notNull(),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clickEvents = pgTable("click_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  elementId: text("element_id").notNull(),
  path: text("path").notNull(),
  sessionId: text("session_id").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pixelConfigs = pgTable("pixel_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  pagePath: text("page_path").notNull(),
  provider: pixelProviderEnum("provider").notNull(),
  pixelId: text("pixel_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rate limiting simples por IP + endpoint + janela de 1 minuto (specs/admin-crm-analytics/tasks.md, bloco 2).
export const rateLimitHits = pgTable("rate_limit_hits", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: text("ip").notNull(),
  endpoint: text("endpoint").notNull(),
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").notNull().default(1),
});

// Extensão além do spec original: clientes reais da agência (MV Imóveis, CapBox, ...)
// e os briefings internos preenchidos para cada um — populado pela página /briefing/[client].
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp"),
  // Quando o cliente entrou de fato — distinto de createdAt (quando a linha foi
  // criada no banco); nullable pra não quebrar clientes já existentes.
  enteredAt: date("entered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientBriefings = pgTable("client_briefings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  payload: jsonb("payload").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// ── Plataforma de operação (specs/client-workspace) ─────────────────────

export const clientEngagementStatusEnum = pgEnum("client_engagement_status", [
  "ativo",
  "pausado",
  "encerrado",
]);

const DEFAULT_METHOD_STAGES = [
  "raio-x",
  "direcao",
  "estrutura",
  "motor-de-aquisicao",
  "curva-de-otimizacao",
];

// Catálogo de produtos como TABELA, não enum — produto é entidade de negócio
// (nome, preço, ativo/inativo mudam), adicionar um novo é INSERT, não migration.
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isEntryProduct: boolean("is_entry_product").notNull().default(false),
  defaultStages: jsonb("default_stages").$type<string[]>().notNull().default(DEFAULT_METHOD_STAGES),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Modelo de cobrança — conjunto pequeno e estável (não muda por decisão de
// negócio do dia a dia como um produto novo mudaria), por isso enum.
export const billingTypeEnum = pgEnum("billing_type", ["recorrente", "pontual"]);
export const billingCycleEnum = pgEnum("billing_cycle", [
  "mensal",
  "trimestral",
  "semestral",
  "anual",
  "unico",
]);

// Plano de um produto (ex.: "Tráfego Pago — Corretores" vs "— Incorporadoras"),
// com preço-base e cobrança padrão. clientProducts pode referenciar um plano
// ou usar valores 100% negociados (planId nullable).
export const productPlans = pgTable("product_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  description: text("description"),
  billingType: billingTypeEnum("billing_type").notNull().default("recorrente"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("mensal"),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull().default("0"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Engajamento = "contrato vivo": qual produto, em que estágio do Método Brain,
// com que status. currentStage é text validado contra src/lib/method-stages.ts
// (não pgEnum): é metodologia estável da marca, mas mantemos o mesmo cuidado
// de não travar em enum de banco. onboardingStatus/operationalStatus seguem o
// mesmo raciocínio — ver src/lib/billing.ts.
//
// contractId/playbookInstanceId/projectId ficam de fora por enquanto: não faz
// sentido criar FK pra tabela que ainda não existe. Entram nas migrations das
// Fases 3/4 quando Contratos e Playbooks forem construídos.
export const clientProducts = pgTable("client_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  planId: uuid("plan_id").references(() => productPlans.id),
  status: clientEngagementStatusEnum("status").notNull().default("ativo"),
  currentStage: text("current_stage").notNull().default("raio-x"),
  startedAt: date("started_at").notNull().defaultNow(),
  endedAt: date("ended_at"),
  notes: text("notes"),

  // Comercial/financeiro
  negotiatedValue: numeric("negotiated_value", { precision: 12, scale: 2 }),
  billingType: billingTypeEnum("billing_type").notNull().default("recorrente"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("mensal"),
  billingDay: integer("billing_day"),
  installments: integer("installments"),
  quantity: integer("quantity").notNull().default(1),
  numberOfUsers: integer("number_of_users"),
  discount: numeric("discount", { precision: 12, scale: 2 }),
  contractTerm: integer("contract_term"),
  // MRR real da contratação — recorrente soma negotiatedValue, pontual soma 0.
  // Calculado em app (src/lib/billing.ts) no create/update, não em query nem
  // em trigger de banco.
  impactOnMrr: numeric("impact_on_mrr", { precision: 12, scale: 2 }).notNull().default("0"),

  // Venda que originou esta contratação (CRM, Fase 2). Nullable: contratações
  // lançadas direto na pasta do cliente, sem passar pelo funil, continuam
  // válidas — e as que já existem não são invalidadas.
  saleId: uuid("sale_id").references((): AnyPgColumn => sales.id),

  // Responsáveis
  responsibleUserId: uuid("responsible_user_id").references(() => adminUsers.id),
  salespersonId: uuid("salesperson_id").references(() => adminUsers.id),

  // Operação — texto validado em app (src/lib/billing.ts), mesmo padrão de
  // method-stages.ts: lista de status muda mais rápido do que justificaria
  // uma migration.
  onboardingStatus: text("onboarding_status").notNull().default("nao-iniciado"),
  implementationProgress: integer("implementation_progress").notNull().default(0),
  operationalStatus: text("operational_status").notNull().default("aguardando-inicio"),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auditoria de transição de estágio — sem isso não dá pra medir tempo de
// ciclo nem mostrar evolução pro cliente numa reunião.
export const clientStageHistory = pgTable("client_stage_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientProductId: uuid("client_product_id").notNull().references(() => clientProducts.id),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  note: text("note"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

// Links próprios (bio do Instagram, WhatsApp, anúncio) com redirect + tracking.
export const trackedLinks = pgTable("tracked_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  destinationUrl: text("destination_url").notNull(),
  campaign: text("campaign"),
  ownerClientId: uuid("owner_client_id").references(() => clients.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const linkClicks = pgTable("link_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: uuid("link_id").notNull().references(() => trackedLinks.id),
  sessionId: text("session_id"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Diagnóstico: transforma o briefing em nota por pilar + recomendação de
// produto justificada (não uma lista genérica de "o que falta comprar").
export const clientDiagnostics = pgTable("client_diagnostics", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  answers: jsonb("answers"),
  scores: jsonb("scores").$type<{
    aquisicao: number;
    posicionamento: number;
    processoComercial: number;
    tecnologia: number;
  }>(),
  bottleneck: text("bottleneck"),
  recommendations: jsonb("recommendations").$type<{ productSlug: string; reason: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── CRM Comercial (specs/crm-comercial) ─────────────────────────────────

// Conjuntos pequenos e estáveis — não mudam por decisão de negócio do dia a
// dia, por isso pgEnum. Origem, tipo de atividade e motivo de perda ficam como
// text validado em src/lib/crm.ts pelo motivo oposto (listas que crescem).
export const opportunityStatusEnum = pgEnum("opportunity_status", ["aberta", "ganha", "perdida"]);
export const opportunityPriorityEnum = pgEnum("opportunity_priority", [
  "baixa",
  "media",
  "alta",
  "urgente",
]);

// Funil. Existe como tabela (e não como constante) porque a Fase 2 já pede
// etapas configuráveis, e múltiplos funis (Novos negócios / Upsell) entram
// depois sem migration.
export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Etapas no banco, nunca hardcoded (requisito explícito da Fase 2).
// isWon/isLost são flags de comportamento, não nomes: renomear "Fechado" para
// "Ganho" não pode quebrar o fluxo de contratação.
// stuckAfterDays é por etapa — negociação tolera mais tempo parada que
// "novo lead", então um limite global mentiria.
export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color"),
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
  defaultProbability: integer("default_probability").notNull().default(0),
  stuckAfterDays: integer("stuck_after_days").notNull().default(14),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Oportunidade: entidade central do CRM.
//
// leadId é nullable de propósito — lead é captura bruta (pode ser curioso,
// duplicado, spam) e oportunidade é pipeline qualificado. Manter as duas
// separadas preserva os leads já existentes e permite oportunidade criada
// manualmente, sem origem no site.
//
// clientId também é nullable: preenchido em upsell (cliente que já existe) ou
// no momento da conversão.
//
// "Dias na etapa" e "alerta de parada" NÃO são colunas — derivam de
// stageEnteredAt em tempo de leitura. Contador materializado ficaria errado
// todo dia à meia-noite, mesmo defeito que o impactOnMrr defasado da Fase 1.
export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id),
  stageId: uuid("stage_id").notNull().references(() => pipelineStages.id),
  leadId: uuid("lead_id").references(() => leads.id),
  clientId: uuid("client_id").references(() => clients.id),

  title: text("title").notNull(),
  contactName: text("contact_name"),
  companyName: text("company_name"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  source: text("source"),

  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  probability: integer("probability").notNull().default(0),
  priority: opportunityPriorityEnum("priority").notNull().default("media"),
  ownerId: uuid("owner_id").references(() => adminUsers.id),
  status: opportunityStatusEnum("status").notNull().default("aberta"),

  stageEnteredAt: timestamp("stage_entered_at").defaultNow().notNull(),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),
  expectedCloseDate: date("expected_close_date"),
  notes: text("notes"),

  lostReason: text("lost_reason"),
  lostNotes: text("lost_notes"),
  lostAt: timestamp("lost_at"),
  wonAt: timestamp("won_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Produtos de interesse — o que o prospect quer comprar, antes de virar
// contratação. planId opcional: nem toda negociação começa com plano definido.
export const opportunityProducts = pgTable("opportunity_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  planId: uuid("plan_id").references(() => productPlans.id),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Uma tabela cobre atividade, reunião, tarefa e anotação — a diferença é
// semântica (type) e temporal (dueAt/doneAt), não estrutural. Quatro tabelas
// quase idênticas só dificultariam montar a timeline unificada do detalhe.
//   dueAt nulo  + doneAt nulo  → anotação
//   dueAt preenchido           → tarefa/compromisso agendado
//   doneAt preenchido          → concluído
export const opportunityActivities = pgTable("opportunity_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id),
  type: text("type").notNull().default("nota"),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at"),
  doneAt: timestamp("done_at"),
  createdBy: uuid("created_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auditoria de movimentação no funil — mesma lógica de clientStageHistory:
// sem isso não dá pra medir tempo de ciclo por etapa nem taxa de conversão.
export const opportunityStageHistory = pgTable("opportunity_stage_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id),
  fromStageId: uuid("from_stage_id").references(() => pipelineStages.id),
  toStageId: uuid("to_stage_id").notNull().references(() => pipelineStages.id),
  changedBy: uuid("changed_by").references(() => adminUsers.id),
  note: text("note"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

// Documento por referência (link), não upload — mesma decisão tomada para
// arquivos de cliente: storage real custa e só se justifica com uso comprovado.
export const opportunityDocuments = pgTable("opportunity_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull().default("outro"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// A venda: agregador do que foi fechado numa conversão.
//
// Sem ela, converter uma oportunidade em 3 produtos criaria 3 client_products
// soltos e "a venda" não existiria como objeto — impossível dizer quanto essa
// negociação fechou, ou pendurar contrato/fatura depois.
//
// É também o ponto de ancoragem das Fases 3/4: contractId, signatureStatus e
// invoiceId entram aqui como colunas aditivas, sem refatorar o CRM.
export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  soldAt: date("sold_at").notNull().defaultNow(),
  salespersonId: uuid("salesperson_id").references(() => adminUsers.id),
  totalMrr: numeric("total_mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  totalOneTime: numeric("total_one_time", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Métodos & Execução — Etapa 1: fundação (specs/metodos-execucao) ────────
//
// Método e Playbook ainda são MODELOS configuráveis nesta etapa — não são
// aplicados a cliente e não geram tarefa real. Isso é a Etapa 2
// (PlaybookInstance/StageInstance/TaskInstance), fora de escopo aqui.

// Pequeno e estável (controla a regra de versionamento), compartilhado por
// method e playbook — evita dois enums quase idênticos.
export const contentStatusEnum = pgEnum("content_status", [
  "rascunho",
  "em_revisao",
  "publicado",
  "arquivado",
]);

// Os 9 valores vêm explícitos do pedido — conjunto fixo, por isso enum
// (diferente de category/resource type, que crescem com o negócio e ficam
// como texto validado em src/lib/methods.ts).
export const playbookTypeEnum = pgEnum("playbook_type", [
  "implantacao",
  "diagnostico",
  "projeto",
  "recorrente",
  "treinamento",
  "acompanhamento",
  "manutencao",
  "renovacao",
  "encerramento",
]);

// Entidade central do módulo. Guarda o estado CORRENTE editável — publicar ou
// arquivar grava um snapshot em methodVersions (ver transitionToDraft em
// src/lib/methods.ts) em vez de versionar campo a campo.
export const methods = pgTable("methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  category: text("category"),
  problemSolved: text("problem_solved"),
  idealClientProfile: text("ideal_client_profile"),
  expectedResult: text("expected_result"),
  principles: jsonb("principles").$type<string[]>().notNull().default([]),
  premises: jsonb("premises").$type<string[]>().notNull().default([]),
  successIndicators: jsonb("success_indicators").$type<string[]>().notNull().default([]),
  risks: jsonb("risks").$type<string[]>().notNull().default([]),
  status: contentStatusEnum("status").notNull().default("rascunho"),
  version: text("version").notNull().default("1.0"),
  authorId: uuid("author_id").references(() => adminUsers.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// N:N método↔produto — mesmo padrão de opportunityProducts. Playbook, ao
// contrário, relaciona 1 produto só (playbooks.productId), por isso não tem
// tabela de junção equivalente.
export const methodProducts = pgTable(
  "method_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    methodId: uuid("method_id").notNull().references(() => methods.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("method_products_method_product_idx").on(table.methodId, table.productId)]
);

// Macroetapas estratégicas (aba Estrutura). Mutáveis direto no método
// corrente — o snapshot completo entra no jsonb de methodVersions no momento
// da publicação, o que não impede comparação estruturada numa fase futura.
export const methodStages = pgTable("method_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  methodId: uuid("method_id").notNull().references(() => methods.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  objective: text("objective"),
  description: text("description"),
  expectedResult: text("expected_result"),
  successCriteria: text("success_criteria"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Log de versões — gravado ao publicar ou arquivar um método (nunca ao
// simples editar um rascunho). Sem comparação avançada entre versões nesta
// etapa: snapshot serve para listagem e para restaurar o estado publicado
// antes de virar rascunho de novo (transitionToDraft).
export const methodVersions = pgTable("method_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  methodId: uuid("method_id").notNull().references(() => methods.id),
  versionLabel: text("version_label").notNull(),
  status: contentStatusEnum("status").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  changeNote: text("change_note"),
  authorId: uuid("author_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Entidade central de playbook. Mesma lógica de "estado corrente" do method.
// productId é obrigatório e único (não N:N) — o pedido fala em "produto
// relacionado" no singular para playbook.
export const playbooks = pgTable("playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  methodId: uuid("method_id").notNull().references(() => methods.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  type: playbookTypeEnum("type").notNull().default("implantacao"),
  defaultDurationDays: integer("default_duration_days"),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
  expectedResult: text("expected_result"),
  // Papéis em texto livre (ex.: "Gestor de Tráfego"), não FK para admin_users
  // — é responsável PADRÃO do modelo, não uma pessoa específica.
  defaultResponsibles: jsonb("default_responsibles").$type<string[]>().notNull().default([]),
  requiredDocuments: jsonb("required_documents").$type<string[]>().notNull().default([]),
  deliverables: jsonb("deliverables").$type<string[]>().notNull().default([]),
  successCriteria: jsonb("success_criteria").$type<string[]>().notNull().default([]),
  status: contentStatusEnum("status").notNull().default("rascunho"),
  version: text("version").notNull().default("1.0"),
  authorId: uuid("author_id").references(() => adminUsers.id),
  publishedAt: timestamp("published_at"),
  // Versão aberta para edição agora — rascunho corrente, ou a última
  // publicada se não houver rascunho aberto. Nullable: playbooks publicados
  // antes desta coluna existir (Etapa 1) só ganham a linha quando alguém
  // abre o construtor (ensureDraftVersion em src/lib/methods.ts).
  currentVersionId: uuid("current_version_id").references((): AnyPgColumn => playbookVersions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mesmo padrão de methodVersions.
export const playbookVersions = pgTable("playbook_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  playbookId: uuid("playbook_id").notNull().references(() => playbooks.id),
  versionLabel: text("version_label").notNull(),
  status: contentStatusEnum("status").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  changeNote: text("change_note"),
  authorId: uuid("author_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Biblioteca de recursos/modelos — estrutura inicial nesta etapa (sem CRUD
// completo). Uma tabela só para método e playbook (diferença é qual FK está
// preenchida), mesmo raciocínio de opportunityActivities cobrir vários tipos.
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: text("type").notNull().default("outro"),
  url: text("url"),
  description: text("description"),
  methodId: uuid("method_id").references(() => methods.id),
  playbookId: uuid("playbook_id").references(() => playbooks.id),
  authorId: uuid("author_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Métodos & Execução — Fase 2.1: construtor visual de playbooks ──────────
//
// playbookVersions até aqui só existia como log gravado no publish/archive —
// não havia linha endereçável para o rascunho corrente. Etapas e blocos
// precisam pendurar num playbookVersionId concreto (inclusive em rascunho),
// então playbooks ganha currentVersionId apontando pra versão aberta agora
// (rascunho ou, na ausência de rascunho, a última publicada). Ver
// ensureDraftVersion em src/lib/methods.ts — cria/reaproveita essa linha,
// nunca sobrescreve uma versão já publicada.
export const playbookBlockPriorityEnum = pgEnum("playbook_block_priority", [
  "baixa",
  "media",
  "alta",
  "critica",
]);

export const durationUnitEnum = pgEnum("duration_unit", [
  "horas",
  "dias_corridos",
  "dias_uteis",
  "semanas",
]);

// Os 12 tipos vêm explícitos do pedido — enum pronto com todos agora (mesma
// decisão já tomada em playbookTypeEnum na Etapa 1), mas esta rodada só
// implementa internal_task e client_request; os demais ficam desabilitados
// na barra "Adicionar bloco" até a próxima entrega da Fase 2.
export const playbookBlockTypeEnum = pgEnum("playbook_block_type", [
  "internal_task",
  "client_request",
  "meeting",
  "checklist",
  "form_briefing",
  "document",
  "analysis",
  "deliverable",
  "approval",
  "wait",
  "milestone",
  "condition",
]);

// Um playbook é modelo, não execução real — o bloco não pode obrigar um
// admin_user específico direto na versão publicada (ela é reaplicada pra
// vários clientes). "papel_padrao"/"usuario_especifico"/"definir_ao_aplicar"
// é conjunto fixo e pequeno (3 modos), por isso enum — ao contrário do papel
// em si (default_assignee_role), que é lista que cresce e fica texto
// validado em app, mesmo raciocínio de overdueAction/dueOffsetAnchor.
export const playbookBlockAssigneeTypeEnum = pgEnum("playbook_block_assignee_type", [
  "papel_padrao",
  "usuario_especifico",
  "definir_ao_aplicar",
]);

// Etapas operacionais de UMA versão do playbook — não confundir com
// methodStages (macroetapas estratégicas do método). Mutáveis livremente
// dentro da versão em rascunho; a versão publicada nunca é editada
// (transitionToDraft/ensureDraftVersion cuidam de abrir um novo rascunho).
export const playbookStageTemplates = pgTable("playbook_stage_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  playbookVersionId: uuid("playbook_version_id").notNull().references(() => playbookVersions.id),
  name: text("name").notNull(),
  objective: text("objective"),
  description: text("description"),
  internalInstructions: text("internal_instructions"),
  position: integer("position").notNull().default(0),
  durationValue: integer("duration_value"),
  durationUnit: durationUnitEnum("duration_unit"),
  defaultAssigneeRole: text("default_assignee_role"),
  isRequired: boolean("is_required").notNull().default(true),
  blocksNextStage: boolean("blocks_next_stage").notNull().default(false),
  completionCriteria: text("completion_criteria"),
  expectedDeliverable: text("expected_deliverable"),
  priority: playbookBlockPriorityEnum("priority").notNull().default("media"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bloco operacional dentro de uma etapa. playbookVersionId é redundante
// (dá pra chegar via stageId) de propósito — evita join extra em toda
// validação de pertencimento e casa com a regra do pedido de nunca alterar
// um registro só pelo ID isolado (rotas validam version → stage → block).
// dueOffsetAnchor/overdueAction ficam como texto validado em app (mesmo
// raciocínio de onboardingStatus): listas que tendem a crescer, ao
// contrário de priority/type, que são conjuntos fixos do pedido.
export const playbookBlockTemplates = pgTable("playbook_block_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  playbookVersionId: uuid("playbook_version_id").notNull().references(() => playbookVersions.id),
  stageId: uuid("stage_id").notNull().references(() => playbookStageTemplates.id),
  type: playbookBlockTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  internalInstructions: text("internal_instructions"),
  position: integer("position").notNull().default(0),
  // Responsável interno tem 3 modalidades (correção funcional pós-homologação
  // da Fase 2.1): "papel_padrao" usa defaultAssigneeRole (papel genérico,
  // reaplicável a qualquer cliente); "usuario_especifico" usa
  // defaultAssigneeId (pessoa real do time, hoje só existe 1 admin_user);
  // "definir_ao_aplicar" deixa os dois em branco de propósito — o
  // responsável só é decidido quando o playbook for aplicado a um cliente
  // (Fase 2.2). Default do BANCO é "definir_ao_aplicar", não "papel_padrao":
  // um bloco sem papel nem usuário selecionado não pode ficar marcado como
  // "papel_padrao" (isso seria um estado inconsistente — validate/route.ts
  // trata "papel_padrao" sem defaultAssigneeRole como erro crítico). O
  // front-end pode mostrar "Papel padrão" como primeira opção visual do
  // seletor, mas só grava "papel_padrao" quando um papel de fato for escolhido.
  assigneeType: playbookBlockAssigneeTypeEnum("assignee_type").notNull().default("definir_ao_aplicar"),
  defaultAssigneeRole: text("default_assignee_role"),
  defaultAssigneeId: uuid("default_assignee_id").references(() => adminUsers.id),
  externalResponsibleRole: text("external_responsible_role"),
  dueOffsetValue: integer("due_offset_value"),
  dueOffsetUnit: durationUnitEnum("due_offset_unit"),
  dueOffsetAnchor: text("due_offset_anchor"),
  priority: playbookBlockPriorityEnum("priority").notNull().default("media"),
  isRequired: boolean("is_required").notNull().default(true),
  blocksStage: boolean("blocks_stage").notNull().default(false),
  dependencyBlockId: uuid("dependency_block_id").references((): AnyPgColumn => playbookBlockTemplates.id),
  expectedResult: text("expected_result"),
  completionCriteria: text("completion_criteria"),
  overdueAction: text("overdue_action"),
  // Só usado por client_request: o que o cliente precisa enviar/responder.
  clientExpectedResponse: text("client_expected_response"),
  // Reunião e Documento (Fase 2.2A) guardam a config específica de tipo
  // aqui — tipada e validada em app (lib/methods.ts), nunca confiando só no
  // frontend. Evita dezenas de colunas nullable pra 2 tipos que não têm
  // sub-itens (ao contrário de Checklist/Formulário, que têm tabela filha
  // própria porque cada item/pergunta precisa de ID, edição e reordenação
  // independentes).
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Item de um bloco Checklist (Fase 2.2A). blockId em cascade: apagar o
// bloco apaga os itens junto — não há sentido em item órfão, e evita ter
// que replicar a limpeza manual que dependencyBlockId precisa (auto-
// referência opcional, caso diferente).
export const playbookChecklistItems = pgTable("playbook_checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockId: uuid("block_id").notNull().references(() => playbookBlockTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  groupName: text("group_name"),
  position: integer("position").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  requiresEvidence: boolean("requires_evidence").notNull().default(false),
  allowsNotes: boolean("allows_notes").notNull().default(true),
  // "ativo ou arquivado" do pedido — soft-hide sem apagar; excluir de
  // verdade é uma ação separada (DELETE), com confirmação no frontend
  // quando o item já tiver configuração relevante.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pergunta de um bloco Formulário/Briefing (Fase 2.2A). Mesmo raciocínio de
// cascade do checklist. "options" só é relevante pra selecao_unica/
// selecao_multipla; "validation" guarda min/max de caracteres ou valor e
// formatos aceitos — pequeno o bastante pra não justificar tabela própria.
export const playbookFormQuestions = pgTable("playbook_form_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockId: uuid("block_id").notNull().references(() => playbookBlockTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  helpText: text("help_text"),
  questionType: text("question_type").notNull(),
  placeholder: text("placeholder"),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  validation: jsonb("validation").$type<Record<string, unknown>>(),
  sectionName: text("section_name"),
  position: integer("position").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tipos de avaliação de um critério de Análise (Fase 2.2B.1) — conjunto
// fixo e pequeno vindo explícito do pedido (8 valores), mesmo raciocínio de
// playbookBlockPriorityEnum/durationUnitEnum: enum do banco, não texto
// validado em app. "analysisType" (Diagnóstico/Auditoria/...) e os campos
// de metodologia/fontes/conclusões NÃO entram aqui — ficam em
// playbook_block_templates.metadata, mesmo padrão de Reunião/Documento
// (sanitizeAnalysisMetadata em lib/methods.ts), porque são texto validado
// em app (listas que tendem a crescer) e/ou não precisam de ID próprio.
export const analysisEvaluationTypeEnum = pgEnum("analysis_evaluation_type", [
  "texto_livre",
  "sim_nao",
  "nota_0_5",
  "nota_0_10",
  "percentual",
  "classificacao",
  "numero",
  "moeda",
]);

// Dimensão de um bloco Análise (Fase 2.2B.1). blockId em cascade — mesmo
// raciocínio de playbookChecklistItems/playbookFormQuestions: apagar o
// bloco apaga as dimensões (e, por tabela, os critérios) junto.
// Índice composto (block_id, position): Postgres não cria índice automático
// pra coluna de FK, e toda listagem/reorder/validação/preview/duplicação
// consulta "dimensões do bloco X, em ordem" — o prefixo (block_id) sozinho
// já cobre também as buscas só por bloco, sem precisar de índice separado.
export const playbookAnalysisDimensions = pgTable(
  "playbook_analysis_dimensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id").notNull().references(() => playbookBlockTemplates.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // 0-100, nullable — "usar pesos" é opcional (metadata.useWeights); peso
    // sem uso ativado fica sem validação de soma, só ausente/livre. Soma
    // total != 100% é aviso de app (não bloqueante); fora de 0-100 é sempre
    // inválido, por isso vira CHECK de banco.
    weight: integer("weight"),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbook_analysis_dimensions_block_position_idx").on(table.blockId, table.position),
    check("playbook_analysis_dimensions_weight_range", sql`${table.weight} is null or (${table.weight} >= 0 and ${table.weight} <= 100)`),
    check("playbook_analysis_dimensions_position_non_negative", sql`${table.position} >= 0`),
  ]
);

// Critério de uma dimensão (Fase 2.2B.1). dimensionId em cascade — excluir
// a dimensão exclui os critérios; excluir o bloco (cascade acima) chega
// até aqui transitivamente via dimensionId → blockId. Mesmo raciocínio de
// índice composto (dimension_id, position) da tabela de dimensões acima.
export const playbookAnalysisCriteria = pgTable(
  "playbook_analysis_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dimensionId: uuid("dimension_id").notNull().references(() => playbookAnalysisDimensions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    evaluationType: analysisEvaluationTypeEnum("evaluation_type").notNull().default("texto_livre"),
    weight: integer("weight"),
    isRequired: boolean("is_required").notNull().default(true),
    requiresEvidence: boolean("requires_evidence").notNull().default(false),
    evidenceDescription: text("evidence_description"),
    guidance: text("guidance"),
    // Só relevante pra evaluationType "classificacao" (≤ 50 itens, validado
    // em app) — mesmo raciocínio de playbookFormQuestions.options.
    options: jsonb("options").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbook_analysis_criteria_dimension_position_idx").on(table.dimensionId, table.position),
    check("playbook_analysis_criteria_weight_range", sql`${table.weight} is null or (${table.weight} >= 0 and ${table.weight} <= 100)`),
    check("playbook_analysis_criteria_position_non_negative", sql`${table.position} >= 0`),
  ]
);
