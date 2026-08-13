CREATE TYPE "public"."client_membership_role" AS ENUM('proprietario', 'coordenador', 'gerente');--> statement-breakpoint
CREATE TYPE "public"."client_membership_status" AS ENUM('ativo', 'inativo');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'cliente';--> statement-breakpoint
CREATE TABLE "client_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "client_membership_role" DEFAULT 'gerente' NOT NULL,
	"status" "client_membership_status" DEFAULT 'ativo' NOT NULL,
	"last_access_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "password_change_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_memberships_client_user_idx" ON "client_memberships" USING btree ("client_id","user_id");