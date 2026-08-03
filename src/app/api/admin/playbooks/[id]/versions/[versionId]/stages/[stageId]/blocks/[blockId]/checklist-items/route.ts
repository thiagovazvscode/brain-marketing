import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookChecklistItems } from "@/db/schema";
import { loadBlockInStage } from "@/lib/playbook-builder";
import { MAX_CHECKLIST_ITEMS_PER_BLOCK, MAX_LIST_ENTRY_LENGTH, MAX_SHORT_TEXT_LENGTH } from "@/lib/methods";

interface ChecklistItemBody {
  title: string;
  description?: string;
  groupName?: string;
  isRequired?: boolean;
  requiresEvidence?: boolean;
  allowsNotes?: boolean;
}

function validateFields(body: Partial<ChecklistItemBody>): string | null {
  if (body.title !== undefined && body.title.trim().length > MAX_SHORT_TEXT_LENGTH) return "Título do item muito longo.";
  if (body.description !== undefined && body.description.length > MAX_LIST_ENTRY_LENGTH * 4) return "Descrição do item muito longa.";
  if (body.groupName !== undefined && body.groupName.length > MAX_SHORT_TEXT_LENGTH) return "Nome do grupo muito longo.";
  return null;
}

// Cria um item de checklist — posição sempre calculada no servidor
// (max(position) + 1 dos itens atuais do bloco), nunca confia no DEFAULT 0
// da coluna nem em nenhum valor vindo do body (regra explícita do pedido).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: Partial<ChecklistItemBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Texto do item é obrigatório." }, { status: 400 });
  }
  const fieldError = validateFields(body);
  if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (chain.block.type !== "checklist") {
      return NextResponse.json({ error: "Este bloco não é um checklist." }, { status: 400 });
    }

    const existing = await db
      .select({ position: playbookChecklistItems.position })
      .from(playbookChecklistItems)
      .where(eq(playbookChecklistItems.blockId, blockId));
    if (existing.length >= MAX_CHECKLIST_ITEMS_PER_BLOCK) {
      return NextResponse.json({ error: `Limite de ${MAX_CHECKLIST_ITEMS_PER_BLOCK} itens por checklist atingido.` }, { status: 400 });
    }
    const nextPosition = existing.reduce((max, r) => Math.max(max, r.position), -1) + 1;

    const [item] = await db
      .insert(playbookChecklistItems)
      .values({
        blockId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        groupName: body.groupName?.trim() || null,
        position: nextPosition,
        isRequired: body.isRequired ?? true,
        requiresEvidence: body.requiresEvidence ?? false,
        allowsNotes: body.allowsNotes ?? true,
      })
      .returning();

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o item." }, { status: 500 });
  }
}
