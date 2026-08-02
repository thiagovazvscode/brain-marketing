CREATE TYPE "public"."playbook_block_assignee_type" AS ENUM('papel_padrao', 'usuario_especifico', 'definir_ao_aplicar');--> statement-breakpoint
ALTER TABLE "playbook_block_templates" ADD COLUMN "assignee_type" "playbook_block_assignee_type" DEFAULT 'definir_ao_aplicar' NOT NULL;--> statement-breakpoint
ALTER TABLE "playbook_block_templates" ADD COLUMN "default_assignee_role" text;