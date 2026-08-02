import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookStageTemplates } from "@/db/schema";
import { assertDraftVersion } from "@/lib/playbook-builder";
import { isValidDurationUnit, isValidPlaybookBlockPriority } from "@/lib/methods";

interface StageBody {
  name: string;
  objective: string;
  description?: string;
  internalInstructions?: string;
  durationValue?: number | null;
  durationUnit?: string | null;
  defaultAssigneeRole?: string;
  isRequired?: boolean;
  blocksNextStage?: boolean;
  completionCriteria?: string;
  expectedDeliverable?: string;
  priority?: string;
  tags?: string[];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;

  let body: Partial<StageBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.objective?.trim()) {
    return NextResponse.json({ error: "Nome da etapa e objetivo são obrigatórios." }, { status: 400 });
  }
  if (body.durationUnit && !isValidDurationUnit(body.durationUnit)) {
    return NextResponse.json({ error: "Unidade de duração inválida." }, { status: 400 });
  }
  if (body.priority && !isValidPlaybookBlockPriority(body.priority)) {
    return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
  }

  try {
    const version = await assertDraftVersion(id, versionId);
    if (!version) return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });

    const [last] = await db
      .select({ position: playbookStageTemplates.position })
      .from(playbookStageTemplates)
      .where(eq(playbookStageTemplates.playbookVersionId, versionId))
      .orderBy(desc(playbookStageTemplates.position))
      .limit(1);
    const nextPosition = (last?.position ?? -1) + 1;

    const [stage] = await db
      .insert(playbookStageTemplates)
      .values({
        playbookVersionId: versionId,
        name: body.name.trim(),
        objective: body.objective.trim(),
        description: body.description?.trim() || null,
        internalInstructions: body.internalInstructions?.trim() || null,
        position: nextPosition,
        durationValue: body.durationValue ?? null,
        durationUnit: (body.durationUnit as never) ?? null,
        defaultAssigneeRole: body.defaultAssigneeRole?.trim() || null,
        isRequired: body.isRequired ?? true,
        blocksNextStage: body.blocksNextStage ?? false,
        completionCriteria: body.completionCriteria?.trim() || null,
        expectedDeliverable: body.expectedDeliverable?.trim() || null,
        priority: (body.priority as never) ?? "media",
        tags: body.tags?.filter(Boolean) ?? [],
      })
      .returning();

    return NextResponse.json({ stage: { ...stage, blocks: [] } });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a etapa." }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { versionId } = await params;
  const stages = await db
    .select()
    .from(playbookStageTemplates)
    .where(eq(playbookStageTemplates.playbookVersionId, versionId))
    .orderBy(asc(playbookStageTemplates.position));
  return NextResponse.json({ stages });
}
