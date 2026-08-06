CREATE TYPE "public"."deliverable_component_format" AS ENUM('pdf', 'presentation', 'document', 'spreadsheet', 'dashboard', 'page', 'video', 'digital_file', 'system', 'multiple', 'other');--> statement-breakpoint
CREATE TYPE "public"."deliverable_component_type" AS ENUM('section', 'document', 'presentation', 'spreadsheet', 'dashboard', 'page', 'video', 'file', 'system', 'other');--> statement-breakpoint
CREATE TABLE "playbook_deliverable_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"component_type" "deliverable_component_type" NOT NULL,
	"expected_format" "deliverable_component_format" NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"default_assignee_type" "playbook_block_assignee_type" DEFAULT 'definir_ao_aplicar' NOT NULL,
	"default_assignee_role" text,
	"default_assignee_id" uuid,
	"acceptance_criteria" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbook_deliverable_components_position_non_negative" CHECK ("playbook_deliverable_components"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "playbook_deliverable_components" ADD CONSTRAINT "playbook_deliverable_components_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_deliverable_components" ADD CONSTRAINT "playbook_deliverable_components_default_assignee_id_admin_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbook_deliverable_components_block_position_idx" ON "playbook_deliverable_components" USING btree ("block_id","position");--> statement-breakpoint
CREATE INDEX "playbook_deliverable_components_default_assignee_idx" ON "playbook_deliverable_components" USING btree ("default_assignee_id");