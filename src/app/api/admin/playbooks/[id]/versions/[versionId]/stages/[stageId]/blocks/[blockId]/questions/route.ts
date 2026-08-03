import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbookFormQuestions } from "@/db/schema";
import { loadBlockInStage } from "@/lib/playbook-builder";
import { MAX_FORM_QUESTIONS_PER_BLOCK, MAX_SHORT_TEXT_LENGTH, isValidFormQuestionType, sanitizeFormQuestionValidation, validateFormQuestionOptions } from "@/lib/methods";

interface QuestionBody {
  label: string;
  helpText?: string;
  questionType: string;
  placeholder?: string;
  options?: string[];
  validation?: Record<string, unknown>;
  sectionName?: string;
  isRequired?: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; stageId: string; blockId: string }> }
) {
  const { id, versionId, stageId, blockId } = await params;

  let body: Partial<QuestionBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!body.label?.trim()) return NextResponse.json({ error: "Enunciado da pergunta é obrigatório." }, { status: 400 });
  if (body.label.trim().length > MAX_SHORT_TEXT_LENGTH) return NextResponse.json({ error: "Enunciado muito longo." }, { status: 400 });
  if (!body.questionType || !isValidFormQuestionType(body.questionType)) {
    return NextResponse.json({ error: "Tipo de pergunta inválido." }, { status: 400 });
  }

  const optionsResult = validateFormQuestionOptions(body.questionType, body.options);
  if ("error" in optionsResult) return NextResponse.json({ error: optionsResult.error }, { status: 400 });

  try {
    const chain = await loadBlockInStage(id, versionId, stageId, blockId);
    if (!chain || chain.version.status !== "rascunho") {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (chain.block.type !== "form_briefing") {
      return NextResponse.json({ error: "Este bloco não é um formulário." }, { status: 400 });
    }

    const existing = await db
      .select({ position: playbookFormQuestions.position })
      .from(playbookFormQuestions)
      .where(eq(playbookFormQuestions.blockId, blockId));
    if (existing.length >= MAX_FORM_QUESTIONS_PER_BLOCK) {
      return NextResponse.json({ error: `Limite de ${MAX_FORM_QUESTIONS_PER_BLOCK} perguntas por formulário atingido.` }, { status: 400 });
    }
    const nextPosition = existing.reduce((max, r) => Math.max(max, r.position), -1) + 1;

    const [question] = await db
      .insert(playbookFormQuestions)
      .values({
        blockId,
        label: body.label.trim(),
        helpText: body.helpText?.trim() || null,
        questionType: body.questionType,
        placeholder: body.placeholder?.trim() || null,
        options: optionsResult.options,
        validation: sanitizeFormQuestionValidation(body.validation),
        sectionName: body.sectionName?.trim() || null,
        position: nextPosition,
        isRequired: body.isRequired ?? true,
      })
      .returning();

    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a pergunta." }, { status: 500 });
  }
}
