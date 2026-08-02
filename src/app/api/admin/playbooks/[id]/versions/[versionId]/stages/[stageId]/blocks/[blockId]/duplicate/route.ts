import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookBlockTemplates } from "@/db/schema";
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
