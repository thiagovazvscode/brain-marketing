import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookVersions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStagesWithBlocks } from "@/lib/playbook-builder";
import type { ValidationIssue } from "@/types/methods";

// Validação mínima da Fase 2.1 (§ do pedido). Único erro crítico nesta
// rodada é playbook sem nenhuma etapa — o resto (campos faltando) vira
// "ajuste": sinaliza mas não bloqueia publicação. Validação avançada fica
// pra próxima entrega, como o próprio pedido define.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;

  const [version] = await db
    .select()
    .from(playbookVersions)
    .where(and(eq(playbookVersions.id, versionId), eq(playbookVersions.playbookId, id)))
    .limit(1);
  if (!version) return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });

  const stages = await getStagesWithBlocks(versionId);
  const issues: ValidationIssue[] = [];

  if (stages.length === 0) {
    issues.push({ severity: "critico", scope: "playbook", message: "O playbook ainda não tem nenhuma etapa." });
  }

  let validStages = 0;
  let validBlocks = 0;
  let totalBlocks = 0;

  for (const stage of stages) {
    let stageOk = true;
    if (!stage.name.trim()) {
      issues.push({ severity: "ajuste", scope: "etapa", stageId: stage.id, message: `Etapa "${stage.name || stage.id}" sem nome.` });
      stageOk = false;
    }
    if (!stage.objective?.trim()) {
      issues.push({ severity: "ajuste", scope: "etapa", stageId: stage.id, message: `Etapa "${stage.name}" sem objetivo.` });
      stageOk = false;
    }
    if (stage.durationValue == null) {
      issues.push({ severity: "ajuste", scope: "etapa", stageId: stage.id, message: `Etapa "${stage.name}" sem duração estimada.` });
      stageOk = false;
    }
    if (stage.isRequired && !stage.completionCriteria?.trim()) {
      issues.push({
        severity: "ajuste",
        scope: "etapa",
        stageId: stage.id,
        message: `Etapa "${stage.name}" é obrigatória mas não tem critério de conclusão.`,
      });
      stageOk = false;
    }

    for (const block of stage.blocks) {
      totalBlocks++;
      let blockOk = true;

      if (!block.title.trim()) {
        issues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, message: `Bloco sem título na etapa "${stage.name}".` });
        blockOk = false;
      }
      // Responsável interno tem 3 modalidades (correção pós-homologação) —
      // "papel_padrao" e "usuario_especifico" só são válidos com o campo
      // correspondente preenchido; "definir_ao_aplicar" é intencionalmente
      // vazio (decidido só na aplicação ao cliente, Fase 2.2), por isso vira
      // aviso e não erro crítico. Falta de qualquer modalidade resolvida é
      // erro crítico — bloqueia publicação.
      if (block.assigneeType === "papel_padrao" && !block.defaultAssigneeRole?.trim()) {
        issues.push({
          severity: "critico",
          scope: "bloco",
          stageId: stage.id,
          blockId: block.id,
          message: `Bloco "${block.title}" está com "Papel padrão" selecionado mas sem papel definido.`,
        });
        blockOk = false;
      } else if (block.assigneeType === "usuario_especifico" && !block.defaultAssigneeId) {
        issues.push({
          severity: "critico",
          scope: "bloco",
          stageId: stage.id,
          blockId: block.id,
          message: `Bloco "${block.title}" está com "Usuário específico" selecionado mas sem usuário definido.`,
        });
        blockOk = false;
      } else if (block.assigneeType === "definir_ao_aplicar") {
        issues.push({
          severity: "ajuste",
          scope: "bloco",
          stageId: stage.id,
          blockId: block.id,
          message: `Bloco "${block.title}" terá o responsável definido apenas ao aplicar este playbook a um cliente.`,
        });
        blockOk = false;
      }

      if (block.isRequired) {
        if (block.dueOffsetValue == null) {
          issues.push({
            severity: "ajuste",
            scope: "bloco",
            stageId: stage.id,
            blockId: block.id,
            message: `Bloco "${block.title}" é obrigatório mas não tem prazo.`,
          });
          blockOk = false;
        }
      }
      if (block.dependencyBlockId) {
        if (block.dependencyBlockId === block.id) {
          issues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, message: `Bloco "${block.title}" depende dele mesmo.` });
          blockOk = false;
        } else if (!stage.blocks.some((b) => b.id === block.dependencyBlockId)) {
          issues.push({
            severity: "ajuste",
            scope: "bloco",
            stageId: stage.id,
            blockId: block.id,
            message: `Bloco "${block.title}" depende de um bloco fora da etapa.`,
          });
          blockOk = false;
        }
      }

      if (blockOk) validBlocks++;
    }

    if (stageOk) validStages++;
  }

  const hasCritical = issues.some((i) => i.severity === "critico");

  return NextResponse.json({
    validStages,
    totalStages: stages.length,
    validBlocks,
    totalBlocks,
    adjustmentsCount: issues.length,
    canPublish: !hasCritical,
    issues,
  });
}
