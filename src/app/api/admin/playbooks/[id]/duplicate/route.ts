import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { slugify } from "@/lib/utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(playbooks).where(eq(playbooks.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });

    const name = `${existing.name} (cópia)`;
    // Cópia sempre nasce rascunho v1.0 — não herda status/versão do original.
    const [copy] = await db
      .insert(playbooks)
      .values({
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        name,
        description: existing.description,
        objective: existing.objective,
        methodId: existing.methodId,
        productId: existing.productId,
        type: existing.type,
        defaultDurationDays: existing.defaultDurationDays,
        prerequisites: existing.prerequisites,
        expectedResult: existing.expectedResult,
        defaultResponsibles: existing.defaultResponsibles,
        requiredDocuments: existing.requiredDocuments,
        deliverables: existing.deliverables,
        successCriteria: existing.successCriteria,
        authorId: existing.authorId,
      })
      .returning();

    return NextResponse.json({ playbook: copy }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível duplicar o playbook." }, { status: 500 });
  }
}
