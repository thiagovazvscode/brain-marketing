CREATE TYPE "public"."billing_cycle" AS ENUM('mensal', 'trimestral', 'semestral', 'anual', 'unico');--> statement-breakpoint
CREATE TYPE "public"."billing_type" AS ENUM('recorrente', 'pontual');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('administrador', 'comercial', 'gestor', 'atendimento', 'financeiro', 'colaborador');--> statement-breakpoint
CREATE TABLE "product_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"billing_type" "billing_type" DEFAULT 'recorrente' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'mensal' NOT NULL,
	"base_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "role" "user_role" DEFAULT 'administrador' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "negotiated_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "billing_type" "billing_type" DEFAULT 'recorrente' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "billing_cycle" "billing_cycle" DEFAULT 'mensal' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "billing_day" integer;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "installments" integer;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "number_of_users" integer;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "discount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "contract_term" integer;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "impact_on_mrr" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "responsible_user_id" uuid;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "salesperson_id" uuid;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "onboarding_status" text DEFAULT 'nao-iniciado' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "implementation_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "operational_status" text DEFAULT 'aguardando-inicio' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "next_action" text;--> statement-breakpoint
ALTER TABLE "client_products" ADD COLUMN "next_action_date" date;--> statement-breakpoint
ALTER TABLE "product_plans" ADD CONSTRAINT "product_plans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_plan_id_product_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."product_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_responsible_user_id_admin_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_salesperson_id_admin_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;