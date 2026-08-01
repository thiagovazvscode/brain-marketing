import { NextResponse } from "next/server";
import { db } from "@/db";
import { opportunityActivities } from "@/db/schema";
import { isValidActivityType } from "@/lib/crm";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { type?: string; title?: string; description?: string; dueAt?: string; done?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Descreva a atividade." }, { status: 400 });

  const type = body.type ?? "nota";
  if (!isValidActivityType(type)) {
    return NextResponse.json({ error: "Tipo de atividade inválido." }, { status: 400 });
  }

  try {
    const [activity] = await db
      .insert(opportunityActivities)
      .values({
        opportunityId: id,
        type,
        title,
        description: body.description?.trim() || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        // Anotação nasce concluída (é registro do que já aconteceu); tarefa com
        // prazo nasce pendente.
        doneAt: body.done ?? !body.dueAt ? new Date() : null,
      })
      .returning();
    return NextResponse.json({ activity }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar a atividade." }, { status: 500 });
  }
}
