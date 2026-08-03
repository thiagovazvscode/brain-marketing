import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookChecklistItems } from "@/db/schema";
import { loadChecklistItemInBlock } from "@/lib/playbook-builder";
import { MAX_LIST_ENTRY_LENGTH, MAX_SHORT_TEXT_LENGTH } from "@/lib/methods";

interface ChecklistItemPatchBody {
  title?: string;
  description?: string;
  groupName?: string;
  isRequired?: boolean;
  requiresEvidence?: boolean;
  allowsNotes?: boolean;
  isActive?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; itemId: string }> }
) {
  const { id, versionId, stageId, blockId, itemId } = await params;

  let body: ChecklistItemPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "Texto do item é obrigatório." }, { status: 400 });
  }
  if (body.title !== undefined && body.title.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Título do item muito longo." }, { status: 400 });
  }
  if (body.description !== undefined && body.description.length > MAX_LIST_ENTRY_LENGTH * 4) {
    return NextResponse.json({ error: "Descrição do item muito longa." }, { status: 400 });
  }

  try {
    const chain = await loadChecklistItemInBlock(id, versionId, stageId, blockId, itemId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.description !== undefined) patch.description = body.description.trim() || null;
    if (body.groupName !== undefined) patch.groupName = body.groupName.trim() || null;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;
    if (body.requiresEvidence !== undefined) patch.requiresEvidence = body.requiresEvidence;
    if (body.allowsNotes !== undefined) patch.allowsNotes = body.allowsNotes;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [item] = await db.update(playbookChecklistItems).set(patch).where(eq(playbookChecklistItems.id, itemId)).returning();
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; itemId: string }> }
) {
  const { id, versionId, stageId, blockId, itemId } = await params;

  try {
    const chain = await loadChecklistItemInBlock(id, versionId, stageId, blockId, itemId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    await db.delete(playbookChecklistItems).where(eq(playbookChecklistItems.id, itemId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o item." }, { status: 500 });
  }
}
