import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookFormQuestions } from "@/db/schema";
import { loadFormQuestionInBlock } from "@/lib/playbook-builder";
import { MAX_SHORT_TEXT_LENGTH, isValidFormQuestionType, sanitizeFormQuestionValidation, validateFormQuestionOptions } from "@/lib/methods";

interface QuestionPatchBody {
  label?: string;
  helpText?: string;
  questionType?: string;
  placeholder?: string;
  options?: string[];
  validation?: Record<string, unknown>;
  sectionName?: string;
  isRequired?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; questionId: string }> }
) {
  const { id, versionId, stageId, blockId, questionId } = await params;

  let body: QuestionPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (body.label !== undefined && !body.label.trim()) {
    return NextResponse.json({ error: "Enunciado da pergunta é obrigatório." }, { status: 400 });
  }
  if (body.label !== undefined && body.label.trim().length > MAX_SHORT_TEXT_LENGTH) {
    return NextResponse.json({ error: "Enunciado muito longo." }, { status: 400 });
  }
  if (body.questionType !== undefined && !isValidFormQuestionType(body.questionType)) {
    return NextResponse.json({ error: "Tipo de pergunta inválido." }, { status: 400 });
  }

  try {
    const chain = await loadFormQuestionInBlock(id, versionId, stageId, blockId, questionId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Pergunta não encontrada." }, { status: 404 });
    }

    // Tipo efetivo pra validar options é o novo, se veio no patch, senão o já salvo.
    const effectiveType = body.questionType ?? chain.question.questionType;
    let sanitizedOptions: string[] | undefined;
    if (body.options !== undefined || body.questionType !== undefined) {
      const result = validateFormQuestionOptions(effectiveType, body.options ?? chain.question.options);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      sanitizedOptions = result.options;
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.label !== undefined) patch.label = body.label.trim();
    if (body.helpText !== undefined) patch.helpText = body.helpText.trim() || null;
    if (body.questionType !== undefined) patch.questionType = body.questionType;
    if (body.placeholder !== undefined) patch.placeholder = body.placeholder.trim() || null;
    if (sanitizedOptions !== undefined) patch.options = sanitizedOptions;
    if (body.validation !== undefined) patch.validation = sanitizeFormQuestionValidation(body.validation);
    if (body.sectionName !== undefined) patch.sectionName = body.sectionName.trim() || null;
    if (body.isRequired !== undefined) patch.isRequired = body.isRequired;

    const [question] = await db.update(playbookFormQuestions).set(patch).where(eq(playbookFormQuestions.id, questionId)).returning();
    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a pergunta." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string; questionId: string }> }
) {
  const { id, versionId, stageId, blockId, questionId } = await params;

  try {
    const chain = await loadFormQuestionInBlock(id, versionId, stageId, blockId, questionId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Pergunta não encontrada." }, { status: 404 });
    }

    await db.delete(playbookFormQuestions).where(eq(playbookFormQuestions.id, questionId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a pergunta." }, { status: 500 });
  }
}
