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
