CREATE TYPE "public"."deliverable_material_moment" AS ENUM('before_deliverable', 'before_component', 'during_production', 'before_review', 'before_delivery', 'define_on_apply');--> statement-breakpoint
CREATE TYPE "public"."deliverable_material_origin" AS ENUM('brain', 'client', 'third_party', 'system', 'define_on_apply');--> statement-breakpoint
CREATE TYPE "public"."deliverable_material_type" AS ENUM('document', 'file', 'link', 'template', 'reference', 'spreadsheet', 'presentation', 'briefing', 'other');--> statement-breakpoint
CREATE TABLE "playbook_deliverable_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"material_type" "deliverable_material_type" NOT NULL,
	"origin" "deliverable_material_origin" NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"assignee_type" "playbook_block_assignee_type" DEFAULT 'definir_ao_aplicar' NOT NULL,
	"assignee_role" text,
	"assignee_id" uuid,
	"required_moment" "deliverable_material_moment" DEFAULT 'define_on_apply' NOT NULL,
	"before_component_id" uuid,
	"url" text,
	"resource_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbook_deliverable_materials_position_non_negative" CHECK ("playbook_deliverable_materials"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "playbook_deliverable_quality_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT true NOT NULL,
	"weight" integer,
	"requires_evidence" boolean DEFAULT false NOT NULL,
	"internal_guidance" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbook_deliverable_quality_criteria_weight_range" CHECK ("playbook_deliverable_quality_criteria"."weight" is null or ("playbook_deliverable_quality_criteria"."weight" >= 0 and "playbook_deliverable_quality_criteria"."weight" <= 100)),
	CONSTRAINT "playbook_deliverable_quality_criteria_position_non_negative" CHECK ("playbook_deliverable_quality_criteria"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "playbook_deliverable_materials" ADD CONSTRAINT "playbook_deliverable_materials_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_deliverable_materials" ADD CONSTRAINT "playbook_deliverable_materials_assignee_id_admin_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_deliverable_materials" ADD CONSTRAINT "playbook_deliverable_materials_before_component_id_playbook_deliverable_components_id_fk" FOREIGN KEY ("before_component_id") REFERENCES "public"."playbook_deliverable_components"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_deliverable_materials" ADD CONSTRAINT "playbook_deliverable_materials_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_deliverable_quality_criteria" ADD CONSTRAINT "playbook_deliverable_quality_criteria_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbook_deliverable_materials_block_position_idx" ON "playbook_deliverable_materials" USING btree ("block_id","position");--> statement-breakpoint
CREATE INDEX "playbook_deliverable_materials_resource_idx" ON "playbook_deliverable_materials" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "playbook_deliverable_materials_before_component_idx" ON "playbook_deliverable_materials" USING btree ("before_component_id");--> statement-breakpoint
CREATE INDEX "playbook_deliverable_quality_criteria_block_position_idx" ON "playbook_deliverable_quality_criteria" USING btree ("block_id","position");