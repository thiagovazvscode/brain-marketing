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

// Regras específicas por tipo (checklist/form/document) dizem a mesma coisa
// que a regra genérica de bloco "obrigatório mas sem prazo" (block.due.missing)
// quando o bloco tem prazo em branco — sem essa lista as duas apareceriam
// juntas pro mesmo problema real. Reunião não tem regra própria de prazo,
// então o genérico continua sendo a única mensagem pra ela (nada a
// deduplicar). Ver dedupeIssues() no fim do arquivo.
const DUE_SPECIFIC_CODES = new Set(["checklist.due.missing", "form.due.missing", "document.due.missing"]);

/**
 * Remove problemas equivalentes: quando uma regra específica do tipo de
 * bloco (código em DUE_SPECIFIC_CODES) já cobre o mesmo bloco, descarta a
 * versão genérica (block.due.missing) do mesmo problema. Nunca remove
 * problemas com códigos diferentes que não sejam esse par conhecido —
 * cada regra continua rodando e reportando normalmente.
 */
function dedupeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const blocksWithSpecificDue = new Set(
    issues.filter((i) => i.blockId && DUE_SPECIFIC_CODES.has(i.code)).map((i) => i.blockId)
  );
  return issues.filter((i) => !(i.code === "block.due.missing" && i.blockId && blocksWithSpecificDue.has(i.blockId)));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;

  const [version] = await db
    .select()
    .from(playbookVersions)
    .where(and(eq(playbookVersions.id, versionId), eq(playbookVersions.playbookId, id)))
    .limit(1);
  if (!version) return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });

  const stages = await getStagesWithBlocks(versionId);
  const rawIssues: ValidationIssue[] = [];

  if (stages.length === 0) {
    rawIssues.push({ severity: "critico", scope: "playbook", code: "playbook.noStages", message: "O playbook ainda não tem nenhuma etapa." });
  }

  let validStages = 0;
  let validBlocks = 0;
  let totalBlocks = 0;

  for (const stage of stages) {
    let stageOk = true;
    if (!stage.name.trim()) {
      rawIssues.push({ severity: "ajuste", scope: "etapa", stageId: stage.id, field: "name", code: "stage.name.missing", message: `Etapa "${stage.name || stage.id}" sem nome.` });
      stageOk = false;
    }
    if (!stage.objective?.trim()) {
      rawIssues.push({ severity: "ajuste", scope: "etapa", stageId: stage.id, field: "objective", code: "stage.objective.missing", message: `Etapa "${stage.name}" sem objetivo.` });
      stageOk = false;
    }
    if (stage.durationValue == null) {
      rawIssues.push({ severity: "ajuste", scope: "etapa", stageId: stage.id, field: "durationValue", code: "stage.duration.missing", message: `Etapa "${stage.name}" sem duração estimada.` });
      stageOk = false;
    }
    if (stage.isRequired && !stage.completionCriteria?.trim()) {
      rawIssues.push({
        severity: "ajuste",
        scope: "etapa",
        stageId: stage.id,
        field: "completionCriteria",
        code: "stage.completionCriteria.missing",
        message: `Etapa "${stage.name}" é obrigatória mas não tem critério de conclusão.`,
      });
      stageOk = false;
    }

    for (const block of stage.blocks) {
      totalBlocks++;
      let blockOk = true;

      if (!block.title.trim()) {
        rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "title", code: "block.title.missing", message: `Bloco sem título na etapa "${stage.name}".` });
        blockOk = false;
      }
      // Responsável interno tem 3 modalidades (correção pós-homologação) —
      // "papel_padrao" e "usuario_especifico" só são válidos com o campo
      // correspondente preenchido; "definir_ao_aplicar" é intencionalmente
      // vazio (decidido só na aplicação ao cliente, Fase 2.2), por isso vira
      // aviso e não erro crítico. Falta de qualquer modalidade resolvida é
      // erro crítico — bloqueia publicação.
      if (block.assigneeType === "papel_padrao" && !block.defaultAssigneeRole?.trim()) {
        rawIssues.push({
          severity: "critico",
          scope: "bloco",
          stageId: stage.id,
          blockId: block.id,
          field: "assignee",
          code: "block.assignee.roleMissing",
          message: `Bloco "${block.title}" está com "Papel padrão" selecionado mas sem papel definido.`,
        });
        blockOk = false;
      } else if (block.assigneeType === "usuario_especifico" && !block.defaultAssigneeId) {
        rawIssues.push({
          severity: "critico",
          scope: "bloco",
          stageId: stage.id,
          blockId: block.id,
          field: "assignee",
          code: "block.assignee.userMissing",
          message: `Bloco "${block.title}" está com "Usuário específico" selecionado mas sem usuário definido.`,
        });
        blockOk = false;
      } else if (block.assigneeType === "definir_ao_aplicar") {
        rawIssues.push({
          severity: "ajuste",
          scope: "bloco",
          stageId: stage.id,
          blockId: block.id,
          field: "assignee",
          code: "block.assignee.deferred",
          message: `Bloco "${block.title}" terá o responsável definido apenas ao aplicar este playbook a um cliente.`,
        });
        blockOk = false;
      }

      if (block.isRequired) {
        if (block.dueOffsetValue == null) {
          rawIssues.push({
            severity: "ajuste",
            scope: "bloco",
            stageId: stage.id,
            blockId: block.id,
            field: "dueOffsetValue",
            code: "block.due.missing",
            message: `Bloco "${block.title}" é obrigatório mas não tem prazo.`,
          });
          blockOk = false;
        }
      }
      // Regras específicas por tipo (Fase 2.2A, item 12 do pedido) — além
      // das genéricas acima (título, responsável, dependência).
      const meta = (block.metadata ?? {}) as Record<string, unknown>;

      if (block.type === "meeting") {
        if (!meta.objective) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.objective", code: "meeting.objective.missing", message: `Reunião "${block.title}" sem objetivo.` });
          blockOk = false;
        }
        if (meta.durationValue == null) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.durationValue", code: "meeting.duration.missing", message: `Reunião "${block.title}" sem duração.` });
          blockOk = false;
        }
        if (!meta.format) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.format", code: "meeting.format.missing", message: `Reunião "${block.title}" sem formato.` });
          blockOk = false;
        }
        if (!block.expectedResult?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.expectedResult", code: "meeting.expectedResult.missing", message: `Reunião "${block.title}" sem resultado esperado.` });
          blockOk = false;
        }
        if (!block.completionCriteria?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.completionCriteria", code: "meeting.completionCriteria.missing", message: `Reunião "${block.title}" sem critério de conclusão.` });
          blockOk = false;
        }
        if (!(meta.agenda as string[] | undefined)?.length) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.agenda", code: "meeting.agenda.missing", message: `Reunião "${block.title}" sem pauta.` });
        }
        if (!(meta.clientParticipants as string[] | undefined)?.length) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.clientParticipants", code: "meeting.clientParticipants.missing", message: `Reunião "${block.title}" sem participantes externos.` });
        }
        const hasPrep = (meta.prerequisites as string[] | undefined)?.length || (meta.requiredDocuments as string[] | undefined)?.length;
        if (!hasPrep) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "meeting.prerequisites", code: "meeting.preparation.missing", message: `Reunião "${block.title}" sem preparação (pré-requisitos ou documentos).` });
        }
      }

      if (block.type === "checklist") {
        if (block.checklistItems.length === 0) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "checklist.items", code: "checklist.items.empty", message: `Checklist "${block.title}" sem itens.` });
          blockOk = false;
        }
        const itemSemTexto = block.checklistItems.some((it) => it.isRequired && !it.title.trim());
        if (itemSemTexto) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "checklist.items", code: "checklist.items.requiredMissingText", message: `Checklist "${block.title}" tem item obrigatório sem texto.` });
          blockOk = false;
        }
        if (block.dueOffsetValue == null) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "dueOffsetValue", code: "checklist.due.missing", message: `Checklist "${block.title}" não possui prazo definido.` });
          blockOk = false;
        }
        if (!block.completionCriteria?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "completionCriteria", code: "checklist.completionCriteria.missing", message: `Checklist "${block.title}" sem critério de conclusão.` });
          blockOk = false;
        }
        if (block.checklistItems.length > 0 && !block.checklistItems.some((it) => it.isRequired)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "checklist.items", code: "checklist.items.noRequired", message: `Checklist "${block.title}" não tem nenhum item obrigatório.` });
        }
        if (!block.checklistItems.some((it) => it.requiresEvidence)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "checklist.items", code: "checklist.items.noEvidence", message: `Checklist "${block.title}" não pede evidência em nenhum item.` });
        }
        if (block.checklistItems.length > 5 && !block.checklistItems.some((it) => it.groupName)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "checklist.items", code: "checklist.items.noGrouping", message: `Checklist "${block.title}" tem muitos itens sem agrupamento.` });
        }
      }

      if (block.type === "form_briefing") {
        if (block.formQuestions.length === 0) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.questions", code: "form.questions.empty", message: `Formulário "${block.title}" sem perguntas.` });
          blockOk = false;
        }
        const perguntaSemEnunciado = block.formQuestions.some((q) => q.isRequired && !q.label.trim());
        if (perguntaSemEnunciado) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.questions", code: "form.questions.requiredMissingLabel", message: `Formulário "${block.title}" tem pergunta obrigatória sem enunciado.` });
          blockOk = false;
        }
        const selecaoSemOpcoes = block.formQuestions.some(
          (q) => (q.questionType === "selecao_unica" || q.questionType === "multipla_selecao") && q.options.length < 2
        );
        if (selecaoSemOpcoes) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.questions", code: "form.questions.choiceMissingOptions", message: `Formulário "${block.title}" tem pergunta de seleção sem opções suficientes.` });
          blockOk = false;
        }
        if (!meta.respondentType) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.respondentType", code: "form.respondentType.missing", message: `Formulário "${block.title}" sem responsável ou respondente definido.` });
          blockOk = false;
        }
        if (block.dueOffsetValue == null) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "dueOffsetValue", code: "form.due.missing", message: `Formulário "${block.title}" não possui prazo definido.` });
          blockOk = false;
        }
        if (!block.completionCriteria?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "completionCriteria", code: "form.completionCriteria.missing", message: `Formulário "${block.title}" sem critério de conclusão.` });
          blockOk = false;
        }
        if (block.formQuestions.length > 0 && !block.formQuestions.some((q) => q.isRequired)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.questions", code: "form.questions.noRequired", message: `Formulário "${block.title}" não tem nenhuma pergunta obrigatória.` });
        }
        if (block.formQuestions.length > 20) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.questions", code: "form.questions.tooLong", message: `Formulário "${block.title}" está muito longo (${block.formQuestions.length} perguntas).` });
        }
        if (block.formQuestions.length > 5 && !block.formQuestions.some((q) => q.sectionName)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "form.questions", code: "form.questions.noSection", message: `Formulário "${block.title}" tem perguntas sem seção.` });
        }
      }

      if (block.type === "document") {
        if (!meta.documentKind) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "document.documentKind", code: "document.kind.missing", message: `Documento "${block.title}" sem tipo.` });
          blockOk = false;
        }
        if (!meta.origin) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "document.origin", code: "document.origin.missing", message: `Documento "${block.title}" sem origem.` });
          blockOk = false;
        }
        if (meta.documentKind === "necessario" && !(meta.acceptedFormats as string[] | undefined)?.length) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "document.acceptedFormats", code: "document.acceptedFormats.missing", message: `Documento necessário "${block.title}" sem formato aceito.` });
          blockOk = false;
        }
        if (!block.completionCriteria?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "completionCriteria", code: "document.completionCriteria.missing", message: `Documento "${block.title}" sem critério de conclusão.` });
          blockOk = false;
        }
        if (!meta.resourceId) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "document.resourceId", code: "document.resource.missing", message: `Documento "${block.title}" sem recurso vinculado.` });
        }
        if (!meta.category) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "document.category", code: "document.category.missing", message: `Documento "${block.title}" sem categoria.` });
        }
        if (!block.description?.trim()) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "description", code: "document.description.missing", message: `Documento "${block.title}" sem descrição.` });
        }
        if (block.dueOffsetValue == null) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "dueOffsetValue", code: "document.due.missing", message: `Documento "${block.title}" não possui prazo definido.` });
        }
      }

      if (block.dependencyBlockId) {
        if (block.dependencyBlockId === block.id) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, code: "block.dependency.self", message: `Bloco "${block.title}" depende dele mesmo.` });
          blockOk = false;
        } else if (!stage.blocks.some((b) => b.id === block.dependencyBlockId)) {
          rawIssues.push({
            severity: "ajuste",
            scope: "bloco",
            stageId: stage.id,
            blockId: block.id,
            code: "block.dependency.outOfStage",
            message: `Bloco "${block.title}" depende de um bloco fora da etapa.`,
          });
          blockOk = false;
        }
      }

      if (blockOk) validBlocks++;
    }

    if (stageOk) validStages++;
  }

  const issues = dedupeIssues(rawIssues);
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
