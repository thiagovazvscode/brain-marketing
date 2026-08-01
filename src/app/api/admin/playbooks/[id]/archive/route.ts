import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbooks, playbookVersions } from "@/db/schema";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(playbooks).where(eq(playbooks.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });
    if (existing.status === "arquivado") {
      return NextResponse.json({ error: "Playbook já está arquivado." }, { status: 400 });
    }

    const [playbook] = await db
      .update(playbooks)
      .set({ status: "arquivado", updatedAt: new Date() })
      .where(eq(playbooks.id, id))
      .returning();

    await db.insert(playbookVersions).values({
      playbookId: id,
      versionLabel: playbook.version,
      status: "arquivado",
      snapshot: playbook,
      authorId: playbook.authorId,
    });

    return NextResponse.json({ playbook });
  } catch {
    return NextResponse.json({ error: "Não foi possível arquivar o playbook." }, { status: 500 });
  }
}
