// Seed do funil comercial padrão (Fase 2 — CRM Comercial).
//
// Isto NÃO é dado de demonstração: pipeline e etapas são configuração real da
// operação, do mesmo jeito que o catálogo de produtos. Por isso não levam
// prefixo "demo-" e não são removidos pelo `seed-demo --clean`.
//
// Idempotente: rodar várias vezes não duplica nem sobrescreve customização
// que você tenha feito nas etapas pela interface.

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { pipelines, pipelineStages } from "@/db/schema";
import { DEFAULT_PIPELINE, DEFAULT_STAGES } from "@/lib/crm";

async function main() {
  // ── Pipeline padrão ───────────────────────────────────────────────────
  let [pipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.slug, DEFAULT_PIPELINE.slug))
    .limit(1);

  if (!pipeline) {
    [pipeline] = await db
      .insert(pipelines)
      .values({
        slug: DEFAULT_PIPELINE.slug,
        name: DEFAULT_PIPELINE.name,
        description: DEFAULT_PIPELINE.description,
        isDefault: true,
        isActive: true,
        sortOrder: 0,
      })
      .returning();
    console.log(`Pipeline "${pipeline.name}" criado.`);
  } else {
    console.log(`Pipeline "${pipeline.name}" já existia — mantido como está.`);
  }

  // ── Etapas ────────────────────────────────────────────────────────────
  // Só insere o que falta. Etapa existente não é atualizada de propósito:
  // se você renomeou "Fechado" para "Ganho" ou mudou o limite de dias parado
  // pela interface, rodar o seed de novo não pode desfazer isso.
  let criadas = 0;

  for (const stage of DEFAULT_STAGES) {
    const [existing] = await db
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(and(eq(pipelineStages.pipelineId, pipeline.id), eq(pipelineStages.slug, stage.slug)))
      .limit(1);

    if (existing) continue;

    await db.insert(pipelineStages).values({
      pipelineId: pipeline.id,
      slug: stage.slug,
      name: stage.name,
      sortOrder: stage.sortOrder,
      color: stage.color,
      defaultProbability: stage.defaultProbability,
      stuckAfterDays: stage.stuckAfterDays,
      isWon: "isWon" in stage ? stage.isWon : false,
      isLost: "isLost" in stage ? stage.isLost : false,
      isActive: true,
    });
    criadas++;
  }

  const total = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(eq(pipelineStages.pipelineId, pipeline.id));

  console.log(`Etapas: ${criadas} criada(s), ${total.length} no total.`);
  console.log("Seed do funil concluído.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao rodar o seed do funil:", error);
  process.exit(1);
});
