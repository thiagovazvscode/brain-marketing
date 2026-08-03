CREATE TABLE "playbook_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"group_name" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"requires_evidence" boolean DEFAULT false NOT NULL,
	"allows_notes" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_form_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"question_type" text NOT NULL,
	"placeholder" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validation" jsonb,
	"section_name" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playbook_checklist_items" ADD CONSTRAINT "playbook_checklist_items_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_form_questions" ADD CONSTRAINT "playbook_form_questions_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE cascade ON UPDATE no action;