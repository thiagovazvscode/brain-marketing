import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookStageTemplates } from "@/db/schema";
import { assertDraftVersion } from "@/lib/playbook-builder";

// Mesmo padrão de /api/admin/methods/[id]/stages/reorder.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;

  let body: { orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const orderedIds = body.orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    return NextResponse.json({ error: "Lista de etapas é obrigatória." }, { status: 400 });
  }

  try {
    const version = await assertDraftVersion(id, versionId);
    if (!version) return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });

    await Promise.all(
      orderedIds.map((stageId, index) =>
        db
          .update(playbookStageTemplates)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(playbookStageTemplates.id, stageId), eq(playbookStageTemplates.playbookVersionId, versionId)))
      )
    );
    const stages = await db
      .select()
      .from(playbookStageTemplates)
      .where(eq(playbookStageTemplates.playbookVersionId, versionId))
      .orderBy(asc(playbookStageTemplates.position));
    return NextResponse.json({ stages });
  } catch {
    return NextResponse.json({ error: "Não foi possível reordenar as etapas." }, { status: 500 });
  }
}
