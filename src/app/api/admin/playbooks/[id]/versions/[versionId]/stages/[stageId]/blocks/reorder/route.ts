import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookBlockTemplates } from "@/db/schema";
import { loadStageInVersion } from "@/lib/playbook-builder";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string }> }
) {
  const { id, versionId, stageId } = await params;

  let body: { orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const orderedIds = body.orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    return NextResponse.json({ error: "Lista de blocos é obrigatória." }, { status: 400 });
  }

  try {
    const chain = await loadStageInVersion(id, versionId, stageId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    await Promise.all(
      orderedIds.map((blockId, index) =>
        db
          .update(playbookBlockTemplates)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(playbookBlockTemplates.id, blockId), eq(playbookBlockTemplates.stageId, stageId)))
      )
    );
    const blocks = await db
      .select()
      .from(playbookBlockTemplates)
      .where(eq(playbookBlockTemplates.stageId, stageId))
      .orderBy(asc(playbookBlockTemplates.position));
    return NextResponse.json({ blocks });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar os blocos." }, { status: 500 });
  }
}
