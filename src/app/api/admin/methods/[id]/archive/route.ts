import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { methods, methodVersions } from "@/db/schema";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(methods).where(eq(methods.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Método não encontrado." }, { status: 404 });
    if (existing.status === "arquivado") {
      return NextResponse.json({ error: "Método já está arquivado." }, { status: 400 });
    }

    const [method] = await db
      .update(methods)
      .set({ status: "arquivado", updatedAt: new Date() })
      .where(eq(methods.id, id))
      .returning();

    await db.insert(methodVersions).values({
      methodId: id,
      versionLabel: method.version,
      status: "arquivado",
      snapshot: method,
      authorId: method.authorId,
    });

    return NextResponse.json({ method });
  } catch {
    return NextResponse.json({ error: "Não foi possível arquivar o método." }, { status: 500 });
  }
}
