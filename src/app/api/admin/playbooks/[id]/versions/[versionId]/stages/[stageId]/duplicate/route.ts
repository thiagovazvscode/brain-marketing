import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookStageTemplates, playbookBlockTemplates } from "@/db/schema";
import { loadStageInVersion } from "@/lib/playbook-builder";

// Duplica etapa + blocos com novos IDs, insere a cópia logo após a
// original e renumera as posições — mesma etapa nunca compartilha registro
// com a cópia (regra explícita do pedido).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string }> }
) {
  const { id, versionId, stageId } = await params;

  try {
    const chain = await loadStageInVersion(id, versionId, stageId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    const original = chain.stage;
    const originalBlocks = await db
      .select()
      .from(playbookBlockTemplates)
      .where(eq(playbookBlockTemplates.stageId, stageId))
      .orderBy(asc(playbookBlockTemplates.position));

    // Ordem atual antes de inserir a cópia — usada abaixo pra renumerar de
    // forma determinística (ORDER BY position não desempata com segurança
    // entre linhas que ainda vão dividir o mesmo valor).
    const currentOrder = await db
      .select({ id: playbookStageTemplates.id })
      .from(playbookStageTemplates)
      .where(eq(playbookStageTemplates.playbookVersionId, versionId))
      .orderBy(asc(playbookStageTemplates.position));

    const [copy] = await db
      .insert(playbookStageTemplates)
      .values({
        playbookVersionId: versionId,
        name: `${original.name} Cópia`,
        objective: original.objective,
        description: original.description,
        internalInstructions: original.internalInstructions,
        position: original.position, // provisório — renumerado abaixo
        durationValue: original.durationValue,
        durationUnit: original.durationUnit,
        defaultAssigneeRole: original.defaultAssigneeRole,
        isRequired: original.isRequired,
        blocksNextStage: original.blocksNextStage,
        completionCriteria: original.completionCriteria,
        expectedDeliverable: original.expectedDeliverable,
        priority: original.priority,
        tags: original.tags,
      })
      .returning();

    if (originalBlocks.length) {
      await db.insert(playbookBlockTemplates).values(
        originalBlocks.map((block) => ({
          playbookVersionId: versionId,
          stageId: copy.id,
          type: block.type,
          title: block.title,
          description: block.description,
          internalInstructions: block.internalInstructions,
          position: block.position,
          defaultAssigneeId: block.defaultAssigneeId,
          externalResponsibleRole: block.externalResponsibleRole,
          dueOffsetValue: block.dueOffsetValue,
          dueOffsetUnit: block.dueOffsetUnit,
          dueOffsetAnchor: block.dueOffsetAnchor,
          priority: block.priority,
          isRequired: block.isRequired,
          blocksStage: block.blocksStage,
          // Dependência entre blocos não é remapeada nesta rodada — se
          // apontasse pro bloco original, cruzaria etapas; fica em branco
          // na cópia pro usuário reconfigurar.
          dependencyBlockId: null,
          expectedResult: block.expectedResult,
          completionCriteria: block.completionCriteria,
          overdueAction: block.overdueAction,
          clientExpectedResponse: block.clientExpectedResponse,
          metadata: block.metadata,
          tags: block.tags,
        }))
      );
    }

    // Renumera todas as posições da versão (0..n-1) com a cópia logo após a
    // original, usando a ordem capturada antes do insert (determinístico).
    const originalIndex = currentOrder.findIndex((s) => s.id === stageId);
    const newOrder = [...currentOrder];
    newOrder.splice(originalIndex + 1, 0, { id: copy.id });

    await Promise.all(
      newOrder.map((s, index) =>
        db.update(playbookStageTemplates).set({ position: index }).where(eq(playbookStageTemplates.id, s.id))
      )
    );

    const [refreshedCopy] = await db.select().from(playbookStageTemplates).where(eq(playbookStageTemplates.id, copy.id)).limit(1);
    const copiedBlocks = await db
      .select()
      .from(playbookBlockTemplates)
      .where(eq(playbookBlockTemplates.stageId, copy.id))
      .orderBy(asc(playbookBlockTemplates.position));

    return NextResponse.json({ stage: { ...refreshedCopy, blocks: copiedBlocks } });
  } catch {
    return NextResponse.json({ error: "Não foi possível duplicar a etapa." }, { status: 500 });
  }
}
