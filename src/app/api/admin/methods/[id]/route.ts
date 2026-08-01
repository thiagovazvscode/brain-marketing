import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { methods, methodProducts } from "@/db/schema";
import { computeVersionTransition } from "@/lib/methods";
import { getMethodDetail } from "@/lib/methods-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const detail = await getMethodDetail(id);
    if (!detail) return NextResponse.json({ error: "Método não encontrado." }, { status: 404 });
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o método." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Partial<{
    name: string;
    shortDescription: string;
    fullDescription: string;
    category: string;
    problemSolved: string;
    idealClientProfile: string;
    expectedResult: string;
    principles: string[];
    premises: string[];
    successIndicators: string[];
    risks: string[];
    authorId: string;
    productIds: string[];
  }>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(methods).where(eq(methods.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Método não encontrado." }, { status: 404 });

    // Regra do item 10: editar um método publicado nunca sobrescreve a versão
    // publicada — volta para rascunho com a versão seguinte. Não grava outro
    // snapshot aqui: o publish() já registrou esse estado publicado em
    // method_versions no momento em que foi publicado (ver src/lib/methods.ts).
    const transition = computeVersionTransition(existing.status, existing.version);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.shortDescription !== undefined) patch.shortDescription = body.shortDescription.trim() || null;
    if (body.fullDescription !== undefined) patch.fullDescription = body.fullDescription.trim() || null;
    if (body.category !== undefined) patch.category = body.category.trim() || null;
    if (body.problemSolved !== undefined) patch.problemSolved = body.problemSolved.trim() || null;
    if (body.idealClientProfile !== undefined) patch.idealClientProfile = body.idealClientProfile.trim() || null;
    if (body.expectedResult !== undefined) patch.expectedResult = body.expectedResult.trim() || null;
    if (body.principles !== undefined) patch.principles = body.principles.filter(Boolean);
    if (body.premises !== undefined) patch.premises = body.premises.filter(Boolean);
    if (body.successIndicators !== undefined) patch.successIndicators = body.successIndicators.filter(Boolean);
    if (body.risks !== undefined) patch.risks = body.risks.filter(Boolean);
    if (body.authorId !== undefined) patch.authorId = body.authorId || null;
    if (transition) {
      patch.status = transition.nextStatus;
      patch.version = transition.nextVersion;
    }

    const [method] = await db.update(methods).set(patch).where(eq(methods.id, id)).returning();

    if (body.productIds !== undefined) {
      await db.delete(methodProducts).where(eq(methodProducts.methodId, id));
      if (body.productIds.length) {
        await db.insert(methodProducts).values(body.productIds.map((productId) => ({ methodId: id, productId })));
      }
    }

    return NextResponse.json({ method });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o método." }, { status: 500 });
  }
}
