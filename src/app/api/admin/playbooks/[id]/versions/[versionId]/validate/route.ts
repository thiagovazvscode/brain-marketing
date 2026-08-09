import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbookVersions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStagesWithBlocks } from "@/lib/playbook-builder";
import { isValidAnalysisEvaluationType, analysisRequiresEvidence, isValidDeliverableComponentType, isValidDeliverableComponentFormat } from "@/lib/methods";
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

      if (block.type === "analysis") {
        if (!meta.objective) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.objective", code: "analysis.objective.missing", message: `Análise "${block.title}" sem objetivo.` });
          blockOk = false;
        }
        if (block.analysisDimensions.length === 0) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.dimensions", code: "analysis.dimensions.empty", message: `Análise "${block.title}" sem dimensões.` });
          blockOk = false;
        }
        if (!block.expectedResult?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "expectedResult", code: "analysis.expectedResult.missing", message: `Análise "${block.title}" sem resultado esperado.` });
          blockOk = false;
        }
        if (!block.completionCriteria?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "completionCriteria", code: "analysis.completionCriteria.missing", message: `Análise "${block.title}" sem critério de conclusão.` });
          blockOk = false;
        }

        const useWeights = Boolean(meta.useWeights);
        let anyDimensionMissingWeight = false;
        for (const dimension of block.analysisDimensions) {
          if (dimension.criteria.length === 0) {
            rawIssues.push({
              severity: "critico",
              scope: "bloco",
              stageId: stage.id,
              blockId: block.id,
              dimensionId: dimension.id,
              field: "analysis.dimensions",
              code: "analysis.dimension.noCriteria",
              message: `Dimensão "${dimension.name}" da análise "${block.title}" não tem critérios.`,
            });
            blockOk = false;
          }
          if (useWeights && dimension.weight == null) anyDimensionMissingWeight = true;

          for (const criterion of dimension.criteria) {
            if (!criterion.name.trim()) {
              rawIssues.push({
                severity: "critico",
                scope: "bloco",
                stageId: stage.id,
                blockId: block.id,
                dimensionId: dimension.id,
                criterionId: criterion.id,
                field: "analysis.dimensions",
                code: "analysis.criterion.nameMissing",
                message: `Um critério da dimensão "${dimension.name}" está sem nome.`,
              });
              blockOk = false;
            }
            if (!isValidAnalysisEvaluationType(criterion.evaluationType)) {
              rawIssues.push({
                severity: "critico",
                scope: "bloco",
                stageId: stage.id,
                blockId: block.id,
                dimensionId: dimension.id,
                criterionId: criterion.id,
                field: "analysis.dimensions",
                code: "analysis.criterion.invalidEvaluationType",
                message: `Critério "${criterion.name}" tem tipo de avaliação inválido.`,
              });
              blockOk = false;
            }
            if (criterion.evaluationType === "classificacao" && criterion.options.length < 2) {
              rawIssues.push({
                severity: "critico",
                scope: "bloco",
                stageId: stage.id,
                blockId: block.id,
                dimensionId: dimension.id,
                criterionId: criterion.id,
                field: "analysis.dimensions",
                code: "analysis.criterion.optionsMissing",
                message: `Critério "${criterion.name}" é de classificação mas tem menos de duas opções.`,
              });
              blockOk = false;
            }
            if (useWeights && criterion.weight == null) {
              rawIssues.push({
                severity: "ajuste",
                scope: "bloco",
                stageId: stage.id,
                blockId: block.id,
                dimensionId: dimension.id,
                criterionId: criterion.id,
                field: "analysis.dimensions",
                code: "analysis.criterion.weightMissing",
                message: `Critério "${criterion.name}" está sem peso definido.`,
              });
            }
          }
        }

        if (anyDimensionMissingWeight) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.dimensions", code: "analysis.dimension.weightMissing", message: `Análise "${block.title}" tem dimensão sem peso definido.` });
        }
        if (useWeights && block.analysisDimensions.length > 0) {
          const weightSum = block.analysisDimensions.reduce((sum, d) => sum + (d.weight ?? 0), 0);
          if (weightSum !== 100) {
            rawIssues.push({
              severity: "ajuste",
              scope: "bloco",
              stageId: stage.id,
              blockId: block.id,
              field: "analysis.dimensions",
              code: "analysis.weights.sumNot100",
              message: `Os pesos das dimensões da análise "${block.title}" somam ${weightSum}%. O recomendado é atingir 100% antes da publicação.`,
            });
          }
        }
        if (!analysisRequiresEvidence(meta.requiresEvidence, block.analysisDimensions)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.requiresEvidence", code: "analysis.evidence.none", message: `Análise "${block.title}" não exige evidência.` });
        }
        if (!meta.recommendationsRequired) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.recommendationsRequired", code: "analysis.recommendations.notRequired", message: `Análise "${block.title}" não exige recomendações.` });
        }
        const totalCriteria = block.analysisDimensions.reduce((sum, d) => sum + d.criteria.length, 0);
        if (block.analysisDimensions.length > 15 || totalCriteria > 60) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.dimensions", code: "analysis.tooLarge", message: `Análise "${block.title}" está muito extensa (${block.analysisDimensions.length} dimensões, ${totalCriteria} critérios).` });
        }
        // analysis.deliverable.none intencionalmente não existe ainda: o
        // bloco Entregável (Fase 2.2B.2) não foi implementado, então não há
        // como o usuário resolver esse alerta — reativar quando o bloco
        // existir.
        if (!(meta.sources as unknown[] | undefined)?.length) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.sources", code: "analysis.sources.none", message: `Análise "${block.title}" sem fontes vinculadas.` });
        }
        if (!meta.analyzedPeriod) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "analysis.analyzedPeriod", code: "analysis.period.missing", message: `Análise "${block.title}" sem período analisado definido.` });
        }
      }

      if (block.type === "deliverable") {
        if (!meta.objective) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.objective", code: "deliverable.objective.missing", message: `Entregável "${block.title}" sem objetivo.` });
          blockOk = false;
        }
        if (!meta.deliverableType) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.deliverableType", code: "deliverable.type.missing", message: `Entregável "${block.title}" sem tipo definido.` });
          blockOk = false;
        }
        if (!meta.primaryFormat) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.primaryFormat", code: "deliverable.format.missing", message: `Entregável "${block.title}" sem formato principal.` });
          blockOk = false;
        }
        if (block.deliverableComponents.length === 0) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.components", code: "deliverable.components.empty", message: `Entregável "${block.title}" sem componentes.` });
          blockOk = false;
        }
        if (!block.completionCriteria?.trim()) {
          rawIssues.push({ severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, field: "completionCriteria", code: "deliverable.completionCriteria.missing", message: `Entregável "${block.title}" sem critério de conclusão.` });
          blockOk = false;
        }

        const activeComponents = block.deliverableComponents.filter((c) => c.isActive);
        if (activeComponents.length > 0 && !activeComponents.some((c) => c.isRequired)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.components", code: "deliverable.components.noRequired", message: `Entregável "${block.title}" não tem nenhum componente obrigatório.` });
        }
        if (!meta.requiresInternalReview) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.requiresInternalReview", code: "deliverable.review.none", message: `Entregável "${block.title}" não exige revisão interna.` });
        }
        if (!(meta.additionalFormats as string[] | undefined)?.length) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "deliverable.additionalFormats", code: "deliverable.additionalFormats.none", message: `Entregável "${block.title}" sem formatos adicionais.` });
        }
        if (block.dueOffsetValue == null) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, field: "dueOffsetValue", code: "deliverable.due.missing", message: `Entregável "${block.title}" sem prazo definido.` });
        }

        for (const component of block.deliverableComponents) {
          if (component.isRequired && !component.title.trim()) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
              field: "deliverable.component.title", code: "deliverable.component.titleMissing",
              message: `Um componente obrigatório do entregável "${block.title}" está sem título.`,
            });
            blockOk = false;
          }
          if (!isValidDeliverableComponentType(component.componentType)) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
              field: "deliverable.component.type", code: "deliverable.component.typeInvalid",
              message: `Componente "${component.title}" tem tipo inválido.`,
            });
            blockOk = false;
          }
          if (!isValidDeliverableComponentFormat(component.expectedFormat)) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
              field: "deliverable.component.format", code: "deliverable.component.formatInvalid",
              message: `Componente "${component.title}" tem formato esperado inválido.`,
            });
            blockOk = false;
          }
          if (component.isRequired) {
            if (component.defaultAssigneeType === "papel_padrao" && !component.defaultAssigneeRole?.trim()) {
              rawIssues.push({
                severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
                field: "deliverable.component.assignee", code: "deliverable.component.assignee.roleMissing",
                message: `Componente obrigatório "${component.title}" está com "Papel padrão" selecionado mas sem papel definido.`,
              });
              blockOk = false;
            } else if (component.defaultAssigneeType === "usuario_especifico" && !component.defaultAssigneeId) {
              rawIssues.push({
                severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
                field: "deliverable.component.assignee", code: "deliverable.component.assignee.userMissing",
                message: `Componente obrigatório "${component.title}" está com "Usuário específico" selecionado mas sem usuário definido.`,
              });
              blockOk = false;
            }
          }
          if (!component.description?.trim()) {
            rawIssues.push({
              severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
              field: "deliverable.component.description", code: "deliverable.component.description.none",
              message: `Componente "${component.title}" sem descrição.`,
            });
          }
          if (!component.acceptanceCriteria?.trim()) {
            rawIssues.push({
              severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, componentId: component.id,
              field: "deliverable.component.acceptanceCriteria", code: "deliverable.component.acceptanceCriteria.none",
              message: `Componente "${component.title}" sem critério de aceite.`,
            });
          }
        }

        // ── Materiais e modelos (Fase 2.2B.2B.3) ──────────────────────────
        const activeMaterials = block.materials.filter((m) => m.isActive);
        const componentIds = new Set(block.deliverableComponents.map((c) => c.id));

        for (const material of block.materials) {
          if (material.isRequired && !material.name.trim()) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
              tab: "materials", field: "material.name", code: "deliverable.material.nameMissing",
              message: `Um material obrigatório do entregável "${block.title}" está sem nome.`,
            });
            blockOk = false;
          }
          if (material.isRequired && !material.origin) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
              tab: "materials", field: "material.origin", code: "deliverable.material.originMissing",
              message: `Material obrigatório "${material.name}" está sem origem definida.`,
            });
            blockOk = false;
          }
          if (material.requiredMoment === "before_component" && !material.beforeComponentId) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
              tab: "materials", field: "material.beforeComponentId", code: "deliverable.material.beforeComponentMissing",
              message: `Material "${material.name}" está com momento "Antes de um componente específico" mas sem componente selecionado.`,
            });
            blockOk = false;
          }
          if (material.beforeComponentId && !componentIds.has(material.beforeComponentId)) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
              tab: "materials", field: "material.beforeComponentId", code: "deliverable.material.beforeComponentInvalid",
              message: `Material "${material.name}" referencia um componente que não pertence mais a este entregável.`,
            });
            blockOk = false;
          }
          if (material.isRequired) {
            if (material.assigneeType === "papel_padrao" && !material.assigneeRole?.trim()) {
              rawIssues.push({
                severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
                tab: "materials", field: "material.assignee", code: "deliverable.material.assignee.roleMissing",
                message: `Material obrigatório "${material.name}" está com "Papel padrão" selecionado mas sem papel definido.`,
              });
              blockOk = false;
            } else if (material.assigneeType === "usuario_especifico" && !material.assigneeId) {
              rawIssues.push({
                severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
                tab: "materials", field: "material.assignee", code: "deliverable.material.assignee.userMissing",
                message: `Material obrigatório "${material.name}" está com "Usuário específico" selecionado mas sem usuário definido.`,
              });
              blockOk = false;
            }
          }
          if (!material.description?.trim()) {
            rawIssues.push({
              severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, materialId: material.id,
              tab: "materials", field: "material.description", code: "deliverable.material.description.none",
              message: `Material "${material.name}" sem descrição.`,
            });
          }
        }
        if (activeMaterials.length === 0) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "materials", field: "deliverable.materials", code: "deliverable.materials.none", message: `Entregável "${block.title}" sem materiais configurados.` });
        } else if (!activeMaterials.some((m) => m.isRequired)) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "materials", field: "deliverable.materials", code: "deliverable.materials.noRequired", message: `Entregável "${block.title}" não tem nenhum material obrigatório.` });
        }

        // ── Critérios de qualidade (Fase 2.2B.2B.3) ───────────────────────
        const activeCriteria = block.qualityCriteria.filter((c) => c.isActive);
        const qualityUseWeights = Boolean(meta.qualityUseWeights);

        for (const criterion of block.qualityCriteria) {
          if (criterion.isRequired && !criterion.name.trim()) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, qualityCriterionId: criterion.id,
              tab: "production_quality", section: "quality", field: "quality.name", code: "deliverable.quality.nameMissing",
              message: `Um critério de qualidade obrigatório do entregável "${block.title}" está sem nome.`,
            });
            blockOk = false;
          }
          if (criterion.weight != null && (criterion.weight < 0 || criterion.weight > 100)) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, qualityCriterionId: criterion.id,
              tab: "production_quality", section: "quality", field: "quality.weight", code: "deliverable.quality.weightOutOfRange",
              message: `Critério de qualidade "${criterion.name}" tem peso fora da faixa de 0 a 100.`,
            });
            blockOk = false;
          }
        }
        if (activeCriteria.length === 0) {
          rawIssues.push({ severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "production_quality", section: "quality", field: "deliverable.quality", code: "deliverable.quality.none", message: `Entregável "${block.title}" sem critérios de qualidade.` });
        } else if (qualityUseWeights) {
          const weightSum = activeCriteria.reduce((sum, c) => sum + (c.weight ?? 0), 0);
          if (weightSum !== 100) {
            rawIssues.push({
              severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "production_quality", section: "quality",
              field: "deliverable.quality", code: "deliverable.quality.weights.sumNot100",
              message: `Os pesos dos critérios de qualidade do entregável "${block.title}" somam ${weightSum}%. O recomendado é atingir 100% antes da publicação.`,
            });
          }
        }

        // ── Revisão (Fase 2.2B.2B.3) ──────────────────────────────────────
        if (meta.requiresInternalReview) {
          const reviewAssigneeType = meta.reviewAssigneeType as string | undefined;
          if (reviewAssigneeType === "papel_padrao" && !(meta.reviewAssigneeRole as string | undefined)?.trim()) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "production_quality", section: "review",
              field: "production.reviewAssignee", code: "deliverable.review.assignee.roleMissing",
              message: `Entregável "${block.title}" exige revisão interna com "Papel padrão" selecionado mas sem papel definido.`,
            });
            blockOk = false;
          } else if (reviewAssigneeType === "usuario_especifico" && !meta.reviewAssigneeId) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "production_quality", section: "review",
              field: "production.reviewAssignee", code: "deliverable.review.assignee.userMissing",
              message: `Entregável "${block.title}" exige revisão interna com "Usuário específico" selecionado mas sem usuário definido.`,
            });
            blockOk = false;
          } else if (!reviewAssigneeType) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "production_quality", section: "review",
              field: "production.reviewAssignee", code: "deliverable.review.assignee.none",
              message: `Entregável "${block.title}" exige revisão interna mas não tem responsável pela revisão definido.`,
            });
            blockOk = false;
          }
          const minimumReviews = meta.minimumReviews as number | undefined;
          if (minimumReviews == null || minimumReviews < 1) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "production_quality", section: "review",
              field: "production.minimumReviews", code: "deliverable.review.minimumReviews.invalid",
              message: `Entregável "${block.title}" exige revisão interna mas o número mínimo de revisões não está definido.`,
            });
            blockOk = false;
          }
        }

        // ── Entrega (Fase 2.2B.2B.3) ──────────────────────────────────────
        if (!(meta.deliveryChannels as string[] | undefined)?.length) {
          rawIssues.push({
            severity: "ajuste", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "delivery", section: "channels",
            field: "delivery.channels", code: "deliverable.delivery.channels.none",
            message: `Entregável "${block.title}" sem canal de entrega definido.`,
          });
        }
        if (meta.requiresPresentation) {
          if (!meta.presentationType) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "delivery", section: "presentation",
              field: "delivery.presentationType", code: "deliverable.delivery.presentation.typeMissing",
              message: `Entregável "${block.title}" exige apresentação mas não tem tipo definido.`,
            });
            blockOk = false;
          }
          const presentationAssigneeType = meta.presentationAssigneeType as string | undefined;
          if (presentationAssigneeType === "papel_padrao" && !(meta.presentationAssigneeRole as string | undefined)?.trim()) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "delivery", section: "presentation",
              field: "delivery.presentationAssignee", code: "deliverable.delivery.presentation.assigneeRoleMissing",
              message: `Apresentação obrigatória de "${block.title}" está com "Papel padrão" selecionado mas sem papel definido.`,
            });
            blockOk = false;
          } else if (presentationAssigneeType === "usuario_especifico" && !meta.presentationAssigneeId) {
            rawIssues.push({
              severity: "critico", scope: "bloco", stageId: stage.id, blockId: block.id, tab: "delivery", section: "presentation",
              field: "delivery.presentationAssignee", code: "deliverable.delivery.presentation.assigneeUserMissing",
              message: `Apresentação obrigatória de "${block.title}" está com "Usuário específico" selecionado mas sem usuário definido.`,
            });
            blockOk = false;
          }
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
