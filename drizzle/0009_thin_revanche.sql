CREATE TYPE "public"."analysis_evaluation_type" AS ENUM('texto_livre', 'sim_nao', 'nota_0_5', 'nota_0_10', 'percentual', 'classificacao', 'numero', 'moeda');--> statement-breakpoint
CREATE TABLE "playbook_analysis_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"evaluation_type" "analysis_evaluation_type" DEFAULT 'texto_livre' NOT NULL,
	"weight" integer,
	"is_required" boolean DEFAULT true NOT NULL,
	"requires_evidence" boolean DEFAULT false NOT NULL,
	"evidence_description" text,
	"guidance" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbook_analysis_criteria_weight_range" CHECK ("playbook_analysis_criteria"."weight" is null or ("playbook_analysis_criteria"."weight" >= 0 and "playbook_analysis_criteria"."weight" <= 100)),
	CONSTRAINT "playbook_analysis_criteria_position_non_negative" CHECK ("playbook_analysis_criteria"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "playbook_analysis_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weight" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbook_analysis_dimensions_weight_range" CHECK ("playbook_analysis_dimensions"."weight" is null or ("playbook_analysis_dimensions"."weight" >= 0 and "playbook_analysis_dimensions"."weight" <= 100)),
	CONSTRAINT "playbook_analysis_dimensions_position_non_negative" CHECK ("playbook_analysis_dimensions"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "playbook_analysis_criteria" ADD CONSTRAINT "playbook_analysis_criteria_dimension_id_playbook_analysis_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."playbook_analysis_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_analysis_dimensions" ADD CONSTRAINT "playbook_analysis_dimensions_block_id_playbook_block_templates_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."playbook_block_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbook_analysis_criteria_dimension_position_idx" ON "playbook_analysis_criteria" USING btree ("dimension_id","position");--> statement-breakpoint
CREATE INDEX "playbook_analysis_dimensions_block_position_idx" ON "playbook_analysis_dimensions" USING btree ("block_id","position");