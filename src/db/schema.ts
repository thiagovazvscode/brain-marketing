import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum, date, numeric, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const leadStatusEnum = pgEnum("lead_status", ["novo", "contatado", "fechado", "perdido"]);
export const leadSourceEnum = pgEnum("lead_source", ["banner", "quiz-cta", "homepage-contact"]);
export const pixelProviderEnum = pgEnum("pixel_provider", ["meta", "ga4"]);

// Papel do usuário dentro do Brain OS — conjunto pequeno e estável o
// suficiente pra justificar enum (ao contrário de onboarding/operational
// status, que mudam com mais frequência e ficam como texto validado em app).
// "cliente" adicionado na Fase 7 (portal do cliente) — mesma tabela/enum de
// usuário do Brain OS, sem criar uma segunda base de auth: um usuário
// "cliente" só ganha acesso de fato através de uma linha em
// clientMemberships (login por si só não abre nenhum client_id).
export const userRoleEnum = pgEnum("user_role", [
  "administrador",
  "comercial",
  "gestor",
  "atendimento",
  "financeiro",
  "colaborador",
  "cliente",
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("administrador"),
  // Fase 7: true logo após a Brain criar o acesso ou resetar a senha — força
  // a troca no próximo login antes de liberar qualquer rota protegida
  // (nunca fica em texto puro em lugar nenhum, só o hash muda).
  passwordChangeRequired: boolean("password_change_required").notNull().default(false),
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

// ── Portal do cliente — Fase 7 (login e acesso) ─────────────────────────────
//
// CLIENT ↓ CLIENT_MEMBERSHIPS ↓ USER (adminUsers) — nunca 1 cliente = 1
// usuário fixo. Vários usuários (proprietário/coordenador/gerente) podem
// futuramente acessar o mesmo cliente; um usuário poderia em tese pertencer
// a mais de um cliente (a UNIQUE é por par cliente+usuário, não por
// usuário). client_id NUNCA vem do browser — toda autorização resolve esta
// tabela a partir do userId da sessão (ver src/lib/client-access.ts e
// src/proxy.ts), nunca de um client_id na URL/query string.
export const clientMembershipRoleEnum = pgEnum("client_membership_role", [
  "proprietario",
  "coordenador",
  "gerente",
]);
export const clientMembershipStatusEnum = pgEnum("client_membership_status", ["ativo", "inativo"]);

export const clientMemberships = pgTable(
  "client_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    userId: uuid("user_id").notNull().references(() => adminUsers.id),
    role: clientMembershipRoleEnum("role").notNull().default("gerente"),
    status: clientMembershipStatusEnum("status").notNull().default("ativo"),
    lastAccessAt: timestamp("last_access_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("client_memberships_client_user_idx").on(table.clientId, table.userId)]
);

// ── Integração Meta Ads (relatório de performance por cliente) ─────────────
//
// clientId aponta sempre pra `clients` (cliente real da agência) — nunca pra
// um tenant externo. Cada cliente tem no máximo 1 connection ativa por vez
// (não modelamos múltiplas contas de anúncio simultâneas pra um cliente
// nesta etapa; um cliente novo com mais de uma conta é um adAccount extra
// pendurado na mesma connection, não uma segunda connection).
export const metaConnectionStatusEnum = pgEnum("meta_connection_status", [
  "connected",
  "expired",
  "revoked",
  "error",
]);

export const metaConnections = pgTable("meta_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  externalUserId: text("external_user_id"),
  externalUserName: text("external_user_name"),
  status: metaConnectionStatusEnum("status").notNull().default("connected"),
  // Token nunca em texto puro — accessTokenEncrypted guarda AES-256-GCM
  // (ver src/lib/meta/crypto.ts), chave em META_TOKEN_ENCRYPTION_KEY
  // (server-only). Nenhuma rota pode selecionar essa coluna em resposta
  // voltada pro browser.
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  expiresAt: timestamp("expires_at"),
  lastValidatedAt: timestamp("last_validated_at"),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const metaAdAccounts = pgTable(
  "meta_ad_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    connectionId: uuid("connection_id").notNull().references(() => metaConnections.id),
    // "act_1234567890" — como o Graph API já retorna, sem reformatar.
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    currency: text("currency"),
    timezoneName: text("timezone_name"),
    accountStatus: integer("account_status"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("meta_ad_accounts_external_id_idx").on(table.externalId)]
);

export const metaCampaigns = pgTable(
  "meta_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    adAccountId: uuid("ad_account_id").notNull().references(() => metaAdAccounts.id),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    objective: text("objective"),
    status: text("status"),
    createdTime: timestamp("created_time"),
    updatedTime: timestamp("updated_time"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("meta_campaigns_external_id_idx").on(table.externalId)]
);

export const metaAdsets = pgTable(
  "meta_adsets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    campaignId: uuid("campaign_id").notNull().references(() => metaCampaigns.id),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    status: text("status"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("meta_adsets_external_id_idx").on(table.externalId)]
);

export const metaAds = pgTable(
  "meta_ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    campaignId: uuid("campaign_id").notNull().references(() => metaCampaigns.id),
    adsetId: uuid("adset_id").notNull().references(() => metaAdsets.id),
    externalId: text("external_id").notNull(),
    creativeId: text("creative_id"),
    name: text("name").notNull(),
    status: text("status"),
    // "IMAGE" | "VIDEO" | "CAROUSEL" | outro — inferido do object_type do
    // creative retornado pela Meta, guardado como texto validado em app
    // (mesmo raciocínio de outros campos "lista que cresce" no schema).
    mediaType: text("media_type"),
    // thumbnail_url da Meta é fixo em 64x64 (visivelmente borrado em qualquer
    // uso maior) — mantido só como último fallback. previewUrl vem do
    // endpoint /adimages (creative real, maior resolução disponível).
    // mediaWidth/mediaHeight só são preenchidos quando a Meta informa a
    // dimensão real do asset — nunca inventados quando ausentes.
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),
    mediaWidth: integer("media_width"),
    mediaHeight: integer("media_height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("meta_ads_external_id_idx").on(table.externalId)]
);

export const metaInsightsLevelEnum = pgEnum("meta_insights_level", ["campaign", "adset", "ad"]);

// Granularidade de 1 dia por entidade — é isso que sustenta os filtros de
// período sem precisar reagregar nada na hora da leitura. entityId guarda o
// external_id da campanha/conjunto/anúncio (não uma FK tipada, porque o
// nível varia linha a linha); metrics carrega os valores já calculados
// (spend/leads/cpl/ctr/... — ver mapeamento de campos em src/lib/meta/sync.ts).
export const metaInsightsDaily = pgTable(
  "meta_insights_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    adAccountId: uuid("ad_account_id").notNull().references(() => metaAdAccounts.id),
    level: metaInsightsLevelEnum("level").notNull(),
    entityId: text("entity_id").notNull(),
    date: date("date").notNull(),
    metrics: jsonb("metrics").notNull().default({}),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("meta_insights_daily_unique_idx").on(table.clientId, table.level, table.entityId, table.date),
    index("meta_insights_daily_client_date_idx").on(table.clientId, table.level, table.date),
  ]
);

// ── Sincronização automática (Fase 6) ───────────────────────────────────────
//
// Registro de auditoria de cada execução de syncMetaAccount — usado tanto
// pro header "Atualizado em" do relatório (última sync com status=success)
// quanto pro lock lógico que impede duas sincronizações simultâneas da mesma
// conta (ver src/lib/meta/sync-service.ts). NUNCA grava o token aqui —
// errorMessage é sempre a mensagem de erro já sanitizada, nunca a exceção
// bruta que poderia conter o token em alguma stack.
export const metaSyncStatusEnum = pgEnum("meta_sync_status", ["running", "success", "partial", "failed"]);

export const metaSyncLogs = pgTable(
  "meta_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    adAccountId: uuid("ad_account_id").notNull().references(() => metaAdAccounts.id),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    status: metaSyncStatusEnum("status").notNull().default("running"),
    campaignsSynced: integer("campaigns_synced").notNull().default(0),
    adsetsSynced: integer("adsets_synced").notNull().default(0),
    adsSynced: integer("ads_synced").notNull().default(0),
    insightsSynced: integer("insights_synced").notNull().default(0),
    errorMessage: text("error_message"),
    trigger: text("trigger").notNull().default("cron"), // "cron" | "manual"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("meta_sync_logs_ad_account_started_idx").on(table.adAccountId, table.startedAt),
    index("meta_sync_logs_client_status_idx").on(table.clientId, table.status),
  ]
);

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

// Componente de um bloco Entregável (Fase 2.2B.2A). Mesmo raciocínio de
// cascade de playbookAnalysisDimensions: blockId em cascade, apagar o bloco
// apaga os componentes junto. component_type/expected_format são NOT NULL
// SEM default de propósito — são informação estrutural obrigatória definida
// no modal de criação; se a API deixar de enviar um dos dois por erro, o
// banco rejeita o INSERT em vez de assumir "section"/"other" silenciosamente
// (correção pós-gate da Fase 2.2B.2A). defaultAssigneeType/Role/Id repetem o
// mesmo padrão de 3 modalidades de playbookBlockTemplates — não são uma
// referência ao responsável do bloco-pai porque um componente pode ter
// responsável próprio, independente do responsável geral do Entregável;
// reaproveita o enum playbookBlockAssigneeTypeEnum já existente (mesmo
// conjunto de 3 valores), sem criar um novo. Sem CHECK combinando os 3
// campos de responsável de propósito — a combinação válida (papel_padrao
// exige role e role nulo pros outros dois, etc.) é responsabilidade da API e
// da validação de publicação, não do schema, pra não travar autosave parcial
// em rascunho.
export const deliverableComponentTypeEnum = pgEnum("deliverable_component_type", [
  "section",
  "document",
  "presentation",
  "spreadsheet",
  "dashboard",
  "page",
  "video",
  "file",
  "system",
  "other",
]);

export const deliverableComponentFormatEnum = pgEnum("deliverable_component_format", [
  "pdf",
  "presentation",
  "document",
  "spreadsheet",
  "dashboard",
  "page",
  "video",
  "digital_file",
  "system",
  "multiple",
  "other",
]);

export const playbookDeliverableComponents = pgTable(
  "playbook_deliverable_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id").notNull().references(() => playbookBlockTemplates.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    componentType: deliverableComponentTypeEnum("component_type").notNull(),
    expectedFormat: deliverableComponentFormatEnum("expected_format").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    defaultAssigneeType: playbookBlockAssigneeTypeEnum("default_assignee_type").notNull().default("definir_ao_aplicar"),
    defaultAssigneeRole: text("default_assignee_role"),
    defaultAssigneeId: uuid("default_assignee_id").references(() => adminUsers.id),
    acceptanceCriteria: text("acceptance_criteria"),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbook_deliverable_components_block_position_idx").on(table.blockId, table.position),
    index("playbook_deliverable_components_default_assignee_idx").on(table.defaultAssigneeId),
    check("playbook_deliverable_components_position_non_negative", sql`${table.position} >= 0`),
  ]
);

// ── Fase 2.2B.2B — Materiais e critérios de qualidade do Entregável ────────
//
// Valores em inglês (diferente dos enums em português já existentes no
// projeto) — decisão explícita desta fase: nomenclatura de banco estável e
// sem acento, independente do idioma dos rótulos exibidos na UI. Não é
// inconsistência com deliverable_component_type/format (que ficaram em
// inglês desde a Fase 2.2B.2A) — é o padrão que playbook_block_type e
// deliverable_component_type já seguem; os enums em português do projeto
// (opportunity_status, client_engagement_status etc.) são os que fogem à
// regra, não o contrário.
export const deliverableMaterialTypeEnum = pgEnum("deliverable_material_type", [
  "document",
  "file",
  "link",
  "template",
  "reference",
  "spreadsheet",
  "presentation",
  "briefing",
  "other",
]);

export const deliverableMaterialOriginEnum = pgEnum("deliverable_material_origin", [
  "brain",
  "client",
  "third_party",
  "system",
  "define_on_apply",
]);

export const deliverableMaterialMomentEnum = pgEnum("deliverable_material_moment", [
  "before_deliverable",
  "before_component",
  "during_production",
  "before_review",
  "before_delivery",
  "define_on_apply",
]);

// Material/modelo necessário para produzir o Entregável (Fase 2.2B.2B).
// Mesmo raciocínio de cascade de playbookDeliverableComponents: blockId em
// cascade, apagar o bloco apaga os materiais junto.
//
// assigneeType/Role/Id reaproveita o MESMO enum de 3 modalidades já usado
// pelo bloco (Fase 2.1) e pelo componente (Fase 2.2B.2A) —
// playbookBlockAssigneeTypeEnum — em vez de criar um enum equivalente
// (decisão explícita desta fase, item 10). O responsável PRINCIPAL de
// produção do Entregável não vive aqui nem em metadata: é herdado direto de
// playbookBlockTemplates.assigneeType/defaultAssigneeRole/defaultAssigneeId
// (decisão explícita desta fase, item 1) — este assigneeType é só de quem
// deve FORNECER este material específico, responsabilidade independente.
//
// beforeComponentId é nullable e só faz sentido quando requiredMoment =
// "before_component" — sem CHECK combinando os dois campos de propósito
// (decisão explícita desta fase, item 9): a consistência trava autosave
// parcial em rascunho, mesmo raciocínio já documentado para os 3 campos de
// responsável de playbookDeliverableComponents. Validação de consistência
// fica pra API/validation (próxima subetapa).
//
// resourceId é a primeira FK real do projeto apontando pra `resources`
// (uso anterior, em document.resourceId, era string solta dentro de
// metadata jsonb, sem FK) — SET NULL porque o vínculo é "possível/futuro":
// remover um recurso da biblioteca não pode apagar nem travar a exclusão
// de um material que o referencia.
//
// Sem UNIQUE(position) de propósito — autosave/rascunho precisa admitir
// posições intermediárias repetidas ou fora de ordem entre um PATCH e o
// próximo, mesmo padrão de todas as tabelas de filhos ordenáveis já
// existentes (nenhuma delas tem UNIQUE em position).
export const playbookDeliverableMaterials = pgTable(
  "playbook_deliverable_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id").notNull().references(() => playbookBlockTemplates.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    materialType: deliverableMaterialTypeEnum("material_type").notNull(),
    origin: deliverableMaterialOriginEnum("origin").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    assigneeType: playbookBlockAssigneeTypeEnum("assignee_type").notNull().default("definir_ao_aplicar"),
    assigneeRole: text("assignee_role"),
    assigneeId: uuid("assignee_id").references(() => adminUsers.id),
    requiredMoment: deliverableMaterialMomentEnum("required_moment").notNull().default("define_on_apply"),
    beforeComponentId: uuid("before_component_id").references((): AnyPgColumn => playbookDeliverableComponents.id, { onDelete: "set null" }),
    url: text("url"),
    resourceId: uuid("resource_id").references(() => resources.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbook_deliverable_materials_block_position_idx").on(table.blockId, table.position),
    index("playbook_deliverable_materials_resource_idx").on(table.resourceId),
    index("playbook_deliverable_materials_before_component_idx").on(table.beforeComponentId),
    check("playbook_deliverable_materials_position_non_negative", sql`${table.position} >= 0`),
  ]
);

// Critério de qualidade do Entregável (Fase 2.2B.2B). Mesmo raciocínio de
// cascade de playbookAnalysisCriteria: blockId em cascade, apagar o bloco
// apaga os critérios junto.
//
// weight segue exatamente o padrão de playbookAnalysisDimensions/Criteria:
// nullable, CHECK 0-100 (erro de banco se fora da faixa), sem CHECK de soma
// = 100 (isso é alerta de app, nunca bloqueante — decisão explícita desta
// fase, item 3). Ao contrário de Análise, não há toggle useWeights numa
// coluna própria aqui: o toggle correspondente (qualityUseWeights) vive em
// metadata do bloco (próxima subetapa), não nesta tabela — a coluna weight
// em si já é nullable independente do toggle.
//
// Sem UNIQUE(position), mesmo raciocínio de playbookDeliverableMaterials
// acima.
export const playbookDeliverableQualityCriteria = pgTable(
  "playbook_deliverable_quality_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id").notNull().references(() => playbookBlockTemplates.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isRequired: boolean("is_required").notNull().default(true),
    weight: integer("weight"),
    requiresEvidence: boolean("requires_evidence").notNull().default(false),
    internalGuidance: text("internal_guidance"),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbook_deliverable_quality_criteria_block_position_idx").on(table.blockId, table.position),
    check("playbook_deliverable_quality_criteria_weight_range", sql`${table.weight} is null or (${table.weight} >= 0 and ${table.weight} <= 100)`),
    check("playbook_deliverable_quality_criteria_position_non_negative", sql`${table.position} >= 0`),
  ]
);
