import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { playbooks, methods, products, adminUsers } from "@/db/schema";
import { isValidContentStatus, isValidPlaybookType } from "@/lib/methods";
import { slugify } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const method = searchParams.get("method");
  const product = searchParams.get("product");
  const q = searchParams.get("q")?.trim();

  try {
    const conditions = [];
    if (status && isValidContentStatus(status)) conditions.push(eq(playbooks.status, status));
    if (type && isValidPlaybookType(type)) conditions.push(eq(playbooks.type, type));
    if (method) conditions.push(eq(playbooks.methodId, method));
    if (product) conditions.push(eq(playbooks.productId, product));
    if (q) conditions.push(or(ilike(playbooks.name, `%${q}%`), ilike(playbooks.description, `%${q}%`)));

    const rows = await db
      .select({
        id: playbooks.id,
        slug: playbooks.slug,
        name: playbooks.name,
        description: playbooks.description,
        type: playbooks.type,
        status: playbooks.status,
        version: playbooks.version,
        defaultDurationDays: playbooks.defaultDurationDays,
        methodId: playbooks.methodId,
        methodName: methods.name,
        productId: playbooks.productId,
        productName: products.name,
        updatedAt: playbooks.updatedAt,
        createdAt: playbooks.createdAt,
        authorId: playbooks.authorId,
        authorName: sql<string | null>`coalesce(${adminUsers.name}, ${adminUsers.email})`,
      })
      .from(playbooks)
      .innerJoin(methods, eq(methods.id, playbooks.methodId))
      .innerJoin(products, eq(products.id, playbooks.productId))
      .leftJoin(adminUsers, eq(adminUsers.id, playbooks.authorId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(playbooks.updatedAt));

    return NextResponse.json({ playbooks: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os playbooks." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    description?: string;
    objective?: string;
    methodId?: string;
    productId?: string;
    type?: string;
    defaultDurationDays?: number;
    prerequisites?: string[];
    expectedResult?: string;
    defaultResponsibles?: string[];
    requiredDocuments?: string[];
    deliverables?: string[];
    successCriteria?: string[];
    authorId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Nome do playbook é obrigatório." }, { status: 400 });
  if (!body.methodId) return NextResponse.json({ error: "Método relacionado é obrigatório." }, { status: 400 });
  if (!body.productId) return NextResponse.json({ error: "Produto relacionado é obrigatório." }, { status: 400 });
  if (body.type && !isValidPlaybookType(body.type)) {
    return NextResponse.json({ error: "Tipo de playbook inválido." }, { status: 400 });
  }

  try {
    const [playbook] = await db
      .insert(playbooks)
      .values({
        slug: slugify(name),
        name,
        description: body.description?.trim() || null,
        objective: body.objective?.trim() || null,
        methodId: body.methodId,
        productId: body.productId,
        type: (body.type as (typeof playbooks.$inferInsert)["type"]) ?? "implantacao",
        defaultDurationDays: body.defaultDurationDays ?? null,
        prerequisites: body.prerequisites?.filter(Boolean) ?? [],
        expectedResult: body.expectedResult?.trim() || null,
        defaultResponsibles: body.defaultResponsibles?.filter(Boolean) ?? [],
        requiredDocuments: body.requiredDocuments?.filter(Boolean) ?? [],
        deliverables: body.deliverables?.filter(Boolean) ?? [],
        successCriteria: body.successCriteria?.filter(Boolean) ?? [],
        authorId: body.authorId || null,
      })
      .returning();

    return NextResponse.json({ playbook }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o playbook (slug já existe?)." }, { status: 500 });
  }
}
