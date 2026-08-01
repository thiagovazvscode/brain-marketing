import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { computeVersionTransition } from "@/lib/methods";

// Ação explícita "Nova versão" do detalhe do playbook (item 9) — mesma regra
// de computeVersionTransition usada no PATCH, mas disparada sem alterar
// nenhum campo ainda: só abre o rascunho da próxima versão para edição. Não
// grava snapshot aqui: o publish() já registrou o estado publicado vigente.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(playbooks).where(eq(playbooks.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });

    const transition = computeVersionTransition(existing.status, existing.version);
    if (!transition) {
      return NextResponse.json(
        { error: "Só é possível criar uma nova versão a partir de um playbook publicado." },
        { status: 400 }
      );
    }

    const [playbook] = await db
      .update(playbooks)
      .set({ status: transition.nextStatus, version: transition.nextVersion, updatedAt: new Date() })
      .where(eq(playbooks.id, id))
      .returning();

    return NextResponse.json({ playbook });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a nova versão." }, { status: 500 });
  }
}
