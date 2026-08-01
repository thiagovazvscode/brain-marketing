import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbooks, playbookVersions } from "@/db/schema";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(playbooks).where(eq(playbooks.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });
    if (existing.status === "publicado") {
      return NextResponse.json({ error: "Playbook já está publicado." }, { status: 400 });
    }

    const now = new Date();
    const [playbook] = await db
      .update(playbooks)
      .set({ status: "publicado", publishedAt: now, updatedAt: now })
      .where(eq(playbooks.id, id))
      .returning();

    await db.insert(playbookVersions).values({
      playbookId: id,
      versionLabel: playbook.version,
      status: "publicado",
      snapshot: playbook,
      authorId: playbook.authorId,
    });

    return NextResponse.json({ playbook });
  } catch {
    return NextResponse.json({ error: "Não foi possível publicar o playbook." }, { status: 500 });
  }
}
