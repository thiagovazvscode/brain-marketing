import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookBlockTemplates, playbookChecklistItems, playbookFormQuestions } from "@/db/schema";
import { loadBlockInStage } from "@/lib/playbook-builder";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    const original = chain.block;

    const currentOrder = await db
      .select({ id: playbookBlockTemplates.id })
      .from(playbookBlockTemplates)
      .where(eq(playbookBlockTemplates.stageId, stageId))
      .orderBy(asc(playbookBlockTemplates.position));

    const [copy] = await db
      .insert(playbookBlockTemplates)
      .values({
        playbookVersionId: versionId,
        stageId,
        type: original.type,
        title: `${original.title} Cópia`,
        description: original.description,
        internalInstructions: original.internalInstructions,
        position: original.position,
        assigneeType: original.assigneeType,
        defaultAssigneeRole: original.defaultAssigneeRole,
        defaultAssigneeId: original.defaultAssigneeId,
        externalResponsibleRole: original.externalResponsibleRole,
        dueOffsetValue: original.dueOffsetValue,
        dueOffsetUnit: original.dueOffsetUnit,
        dueOffsetAnchor: original.dueOffsetAnchor,
        priority: original.priority,
        isRequired: original.isRequired,
        blocksStage: original.blocksStage,
        // Não herda dependência do original — evita ciclo/duplicidade de
        // dependência entre original e cópia, mesma decisão de duplicar etapa.
        dependencyBlockId: null,
        expectedResult: original.expectedResult,
        completionCriteria: original.completionCriteria,
        overdueAction: original.overdueAction,
        clientExpectedResponse: original.clientExpectedResponse,
        metadata: original.metadata,
        tags: original.tags,
      })
      .returning();

    // Checklist/Formulário: itens e perguntas são filhos do bloco, clonam
    // junto com IDs novos — nunca compartilhados entre o original e a cópia.
    if (original.type === "checklist") {
      const items = await db.select().from(playbookChecklistItems).where(eq(playbookChecklistItems.blockId, blockId)).orderBy(asc(playbookChecklistItems.position));
      if (items.length > 0) {
        await db.insert(playbookChecklistItems).values(
          items.map((item) => ({
            blockId: copy.id,
            title: item.title,
            description: item.description,
            groupName: item.groupName,
            position: item.position,
            isRequired: item.isRequired,
            requiresEvidence: item.requiresEvidence,
            allowsNotes: item.allowsNotes,
            isActive: item.isActive,
          }))
        );
      }
    }
    if (original.type === "form_briefing") {
      const questions = await db.select().from(playbookFormQuestions).where(eq(playbookFormQuestions.blockId, blockId)).orderBy(asc(playbookFormQuestions.position));
      if (questions.length > 0) {
        await db.insert(playbookFormQuestions).values(
          questions.map((q) => ({
            blockId: copy.id,
            label: q.label,
            helpText: q.helpText,
            questionType: q.questionType,
            placeholder: q.placeholder,
            options: q.options,
            validation: q.validation,
            sectionName: q.sectionName,
            position: q.position,
            isRequired: q.isRequired,
          }))
        );
      }
    }

    const originalIndex = currentOrder.findIndex((b) => b.id === blockId);
    const newOrder = [...currentOrder];
    newOrder.splice(originalIndex + 1, 0, { id: copy.id });

    await Promise.all(
      newOrder.map((b, index) =>
        db.update(playbookBlockTemplates).set({ position: index }).where(eq(playbookBlockTemplates.id, b.id))
      )
    );

    const [refreshedCopy] = await db.select().from(playbookBlockTemplates).where(eq(playbookBlockTemplates.id, copy.id)).limit(1);
    return NextResponse.json({ block: refreshedCopy });
  } catch {
    return NextResponse.json({ error: "Não foi possível duplicar o bloco." }, { status: 500 });
  }
}
