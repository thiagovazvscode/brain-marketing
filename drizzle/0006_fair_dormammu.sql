CREATE TYPE "public"."duration_unit" AS ENUM('horas', 'dias_corridos', 'dias_uteis', 'semanas');--> statement-breakpoint
CREATE TYPE "public"."playbook_block_priority" AS ENUM('baixa', 'media', 'alta', 'critica');--> statement-breakpoint
CREATE TYPE "public"."playbook_block_type" AS ENUM('internal_task', 'client_request', 'meeting', 'checklist', 'form_briefing', 'document', 'analysis', 'deliverable', 'approval', 'wait', 'milestone', 'condition');--> statement-breakpoint
CREATE TABLE "playbook_block_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_version_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"type" "playbook_block_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"internal_instructions" text,
	"position" integer DEFAULT 0 NOT NULL,
	"default_assignee_id" uuid,
	"external_responsible_role" text,
	"due_offset_value" integer,
	"due_offset_unit" "duration_unit",
	"due_offset_anchor" text,
	"priority" "playbook_block_priority" DEFAULT 'media' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"blocks_stage" boolean DEFAULT false NOT NULL,
	"dependency_block_id" uuid,
	"expected_result" text,
	"completion_criteria" text,
	"overdue_action" text,
	"client_expected_response" text,
	"metadata" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_stage_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_version_id" uuid NOT NULL,
	"name" text NOT NULL,
	"objective" text,
	"description" text,
	"internal_instructions" text,
	"position" integer DEFAULT 0 NOT NULL,
	"duration_value" integer,
	"duration_unit" "duration_unit",
	"default_assignee_role" text,
	"is_required" boolean DEFAULT true NOT NULL,
	"blocks_next_stage" boolean DEFAULT false NOT NULL,
	"completion_criteria" text,
	"expected_deliverable" text,
	"priority" "playbook_block_priority" DEFAULT 'media' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "current_version_id" uuid;--> statement-breakpoint
ALTER TABLE "playbook_block_templates" ADD CONSTRAINT "playbook_block_templates_playbook_version_id_playbook_versions_id_fk" FOREIGN KEY ("playbook_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_block_templates" ADD CONSTRAINT "playbook_block_templates_stage_id_playbook_stage_templates_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."playbook_stage_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_block_templates" ADD CONSTRAINT "playbook_block_templates_default_assignee_id_admin_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_block_templates" ADD CONSTRAINT "playbook_block_templates_dependency_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("dependency_block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_stage_templates" ADD CONSTRAINT "playbook_stage_templates_playbook_version_id_playbook_versions_id_fk" FOREIGN KEY ("playbook_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_current_version_id_playbook_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE no action ON UPDATE no action;