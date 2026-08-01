import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { methods, methodProducts, methodStages } from "@/db/schema";
import { slugify } from "@/lib/utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(methods).where(eq(methods.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Método não encontrado." }, { status: 404 });

    const name = `${existing.name} (cópia)`;
    // Cópia sempre nasce rascunho v1.0 — não herda status/versão do original.
    const [copy] = await db
      .insert(methods)
      .values({
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        name,
        shortDescription: existing.shortDescription,
        fullDescription: existing.fullDescription,
        category: existing.category,
        problemSolved: existing.problemSolved,
        idealClientProfile: existing.idealClientProfile,
        expectedResult: existing.expectedResult,
        principles: existing.principles,
        premises: existing.premises,
        successIndicators: existing.successIndicators,
        risks: existing.risks,
        authorId: existing.authorId,
      })
      .returning();

    const [relatedProducts, stages] = await Promise.all([
      db.select({ productId: methodProducts.productId }).from(methodProducts).where(eq(methodProducts.methodId, id)),
      db.select().from(methodStages).where(eq(methodStages.methodId, id)).orderBy(asc(methodStages.sortOrder)),
    ]);

    if (relatedProducts.length) {
      await db.insert(methodProducts).values(relatedProducts.map((p) => ({ methodId: copy.id, productId: p.productId })));
    }
    if (stages.length) {
      await db.insert(methodStages).values(
        stages.map((s) => ({
          methodId: copy.id,
          name: s.name,
          sortOrder: s.sortOrder,
          objective: s.objective,
          description: s.description,
          expectedResult: s.expectedResult,
          successCriteria: s.successCriteria,
        }))
      );
    }

    return NextResponse.json({ method: copy }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível duplicar o método." }, { status: 500 });
  }
}
