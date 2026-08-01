-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 0004 — PREVISTA (Fase 2: CRM Comercial)
--
-- ATENÇÃO: este arquivo é REFERÊNCIA PARA REVISÃO, não a migration oficial.
-- Ele NÃO está registrado em drizzle/meta/_journal.json e NÃO deve ser
-- movido para a pasta drizzle/ manualmente.
--
-- A migration oficial deve ser gerada na sua máquina com:
--     npm run db:generate     (lê src/db/schema.ts e cria drizzle/0004_*.sql)
--     npm run db:push         (aplica no Neon)
--
-- O motivo: o ambiente de validação usa o node_modules instalado no Windows,
-- que não tem os binários Linux do esbuild/drizzle-kit, então drizzle-kit não
-- executa aqui. Gerar o snapshot à mão seria pior — um snapshot inconsistente
-- faz o drizzle emitir migrations duplicadas depois.
--
-- Este SQL existe para você conferir ANTES de aplicar que a migration é
-- 100% aditiva: nenhum DROP, TRUNCATE ou DELETE, nenhuma coluna existente
-- alterada.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Enums novos ─────────────────────────────────────────────────────────
CREATE TYPE "public"."opportunity_status" AS ENUM('aberta', 'ganha', 'perdida');
CREATE TYPE "public"."opportunity_priority" AS ENUM('baixa', 'media', 'alta', 'urgente');

-- ── Funil ───────────────────────────────────────────────────────────────
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipelines_slug_unique" UNIQUE("slug")
);

CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" text,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"default_probability" integer DEFAULT 0 NOT NULL,
	"stuck_after_days" integer DEFAULT 14 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ── Oportunidade (entidade central) ─────────────────────────────────────
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"lead_id" uuid,
	"client_id" uuid,
	"title" text NOT NULL,
	"contact_name" text,
	"company_name" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"source" text,
	"estimated_value" numeric(12, 2),
	"probability" integer DEFAULT 0 NOT NULL,
	"priority" "opportunity_priority" DEFAULT 'media' NOT NULL,
	"owner_id" uuid,
	"status" "opportunity_status" DEFAULT 'aberta' NOT NULL,
	"stage_entered_at" timestamp DEFAULT now() NOT NULL,
	"next_action" text,
	"next_action_date" date,
	"expected_close_date" date,
	"notes" text,
	"lost_reason" text,
	"lost_notes" text,
	"lost_at" timestamp,
	"won_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ── Produtos de interesse ───────────────────────────────────────────────
CREATE TABLE "opportunity_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"plan_id" uuid,
	"estimated_value" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ── Atividades / reuniões / tarefas / anotações ─────────────────────────
CREATE TABLE "opportunity_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"type" text DEFAULT 'nota' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp,
	"done_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ── Histórico de etapas ─────────────────────────────────────────────────
CREATE TABLE "opportunity_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"from_stage_id" uuid,
	"to_stage_id" uuid NOT NULL,
	"changed_by" uuid,
	"note" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);

-- ── Documentos (por link) ───────────────────────────────────────────────
CREATE TABLE "opportunity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"category" text DEFAULT 'outro' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);

-- ── Venda (âncora oportunidade ↔ cliente ↔ contratação) ─────────────────
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid,
	"client_id" uuid NOT NULL,
	"sold_at" date DEFAULT now() NOT NULL,
	"salesperson_id" uuid,
	"total_mrr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_one_time" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ── Única alteração em tabela existente: ADD COLUMN (aditiva) ───────────
ALTER TABLE "client_products" ADD COLUMN "sale_id" uuid;

-- ── Chaves estrangeiras ─────────────────────────────────────────────────
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_pipelines_id_fk"
  FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipeline_id_pipelines_id_fk"
  FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stage_id_pipeline_stages_id_fk"
  FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_leads_id_fk"
  FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_admin_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "opportunity_products" ADD CONSTRAINT "opportunity_products_opportunity_id_opportunities_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunity_products" ADD CONSTRAINT "opportunity_products_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunity_products" ADD CONSTRAINT "opportunity_products_plan_id_product_plans_id_fk"
  FOREIGN KEY ("plan_id") REFERENCES "public"."product_plans"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunity_id_opportunities_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_created_by_admin_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_opportunity_id_opportunities_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_from_stage_id_pipeline_stages_id_fk"
  FOREIGN KEY ("from_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_to_stage_id_pipeline_stages_id_fk"
  FOREIGN KEY ("to_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_changed_by_admin_users_id_fk"
  FOREIGN KEY ("changed_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "opportunity_documents" ADD CONSTRAINT "opportunity_documents_opportunity_id_opportunities_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "sales" ADD CONSTRAINT "sales_opportunity_id_opportunities_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sales" ADD CONSTRAINT "sales_salesperson_id_admin_users_id_fk"
  FOREIGN KEY ("salesperson_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "client_products" ADD CONSTRAINT "client_products_sale_id_sales_id_fk"
  FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;
