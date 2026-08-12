CREATE TYPE "public"."meta_sync_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "meta_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"ad_account_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" "meta_sync_status" DEFAULT 'running' NOT NULL,
	"campaigns_synced" integer DEFAULT 0 NOT NULL,
	"adsets_synced" integer DEFAULT 0 NOT NULL,
	"ads_synced" integer DEFAULT 0 NOT NULL,
	"insights_synced" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"trigger" text DEFAULT 'cron' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meta_sync_logs" ADD CONSTRAINT "meta_sync_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_sync_logs" ADD CONSTRAINT "meta_sync_logs_ad_account_id_meta_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."meta_ad_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meta_sync_logs_ad_account_started_idx" ON "meta_sync_logs" USING btree ("ad_account_id","started_at");--> statement-breakpoint
CREATE INDEX "meta_sync_logs_client_status_idx" ON "meta_sync_logs" USING btree ("client_id","status");