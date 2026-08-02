import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { isValidPlaybookType } from "@/lib/methods";
import { getPlaybookDetail } from "@/lib/methods-data";
import { ensureDraftVersion } from "@/lib/playbook-builder";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const detail = await getPlaybookDetail(id);
    if (!detail) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o playbook." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Partial<{
    name: string;
    description: string;
    objective: string;
    methodId: string;
    productId: string;
    type: string;
    defaultDurationDays: number | null;
    prerequisites: string[];
    expectedResult: string;
    defaultResponsibles: string[];
    requiredDocuments: string[];
    deliverables: string[];
    successCriteria: string[];
    authorId: string;
  }>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (body.type && !isValidPlaybookType(body.type)) {
    return NextResponse.json({ error: "Tipo de playbook inválido." }, { status: 400 });
  }

  try {
    // Mesma regra do método (src/lib/methods.ts): publicado não é editado
    // in-place, volta para rascunho com a versão seguinte — e agora essa
    // transição materializa a linha de playbookVersions que o construtor de
    // etapas/blocos usa (ensureDraftVersion em src/lib/playbook-builder.ts).
    // O publish() já registrou o snapshot da versão publicada — não duplica aqui.
    const result = await ensureDraftVersion(id);
    if (!result) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = body.description.trim() || null;
    if (body.objective !== undefined) patch.objective = body.objective.trim() || null;
    if (body.methodId !== undefined) patch.methodId = body.methodId;
    if (body.productId !== undefined) patch.productId = body.productId;
    if (body.type !== undefined) patch.type = body.type;
    if (body.defaultDurationDays !== undefined) patch.defaultDurationDays = body.defaultDurationDays;
    if (body.prerequisites !== undefined) patch.prerequisites = body.prerequisites.filter(Boolean);
    if (body.expectedResult !== undefined) patch.expectedResult = body.expectedResult.trim() || null;
    if (body.defaultResponsibles !== undefined) patch.defaultResponsibles = body.defaultResponsibles.filter(Boolean);
    if (body.requiredDocuments !== undefined) patch.requiredDocuments = body.requiredDocuments.filter(Boolean);
    if (body.deliverables !== undefined) patch.deliverables = body.deliverables.filter(Boolean);
    if (body.successCriteria !== undefined) patch.successCriteria = body.successCriteria.filter(Boolean);
    if (body.authorId !== undefined) patch.authorId = body.authorId || null;

    const [playbook] = await db.update(playbooks).set(patch).where(eq(playbooks.id, id)).returning();
    return NextResponse.json({ playbook });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o playbook." }, { status: 500 });
  }
}
