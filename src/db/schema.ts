import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum, date } from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", ["novo", "contatado", "fechado", "perdido"]);
export const leadSourceEnum = pgEnum("lead_source", ["banner", "quiz-cta", "homepage-contact"]);
export const pixelProviderEnum = pgEnum("pixel_provider", ["meta", "ga4"]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
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

// Engajamento = "contrato vivo": qual produto, em que estágio do Método Brain,
// com que status. currentStage é text validado contra src/lib/method-stages.ts
// (não pgEnum): é metodologia estável da marca, mas mantemos o mesmo cuidado
// de não travar em enum de banco.
export const clientProducts = pgTable("client_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  status: clientEngagementStatusEnum("status").notNull().default("ativo"),
  currentStage: text("current_stage").notNull().default("raio-x"),
  startedAt: date("started_at").notNull().defaultNow(),
  endedAt: date("ended_at"),
  notes: text("notes"),
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
