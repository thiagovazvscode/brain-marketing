import { NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { methods, methodProducts, playbooks, products, adminUsers } from "@/db/schema";
import { isValidContentStatus } from "@/lib/methods";
import { slugify } from "@/lib/utils";

// Sem paginação por enquanto — mesmo raciocínio do funil do CRM: o volume de
// métodos cadastrados pela Brain cabe numa tela nesta etapa.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const author = searchParams.get("author");
  const product = searchParams.get("product");
  const q = searchParams.get("q")?.trim();

  try {
    const conditions = [];
    if (status && isValidContentStatus(status)) conditions.push(eq(methods.status, status));
    if (category) conditions.push(eq(methods.category, category));
    if (author) conditions.push(eq(methods.authorId, author));
    if (q) conditions.push(or(ilike(methods.name, `%${q}%`), ilike(methods.shortDescription, `%${q}%`)));

    if (product) {
      const productMethodRows = await db
        .select({ methodId: methodProducts.methodId })
        .from(methodProducts)
        .where(eq(methodProducts.productId, product));
      const ids = productMethodRows.map((r) => r.methodId);
      if (!ids.length) return NextResponse.json({ methods: [] });
      conditions.push(inArray(methods.id, ids));
    }

    const rows = await db
      .select({
        id: methods.id,
        slug: methods.slug,
        name: methods.name,
        shortDescription: methods.shortDescription,
        category: methods.category,
        status: methods.status,
        version: methods.version,
        authorId: methods.authorId,
        authorName: sql<string | null>`coalesce(${adminUsers.name}, ${adminUsers.email})`,
        updatedAt: methods.updatedAt,
        createdAt: methods.createdAt,
      })
      .from(methods)
      .leftJoin(adminUsers, eq(adminUsers.id, methods.authorId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(methods.updatedAt));

    const ids = rows.map((r) => r.id);
    const [productRows, playbookCountRows] = await Promise.all([
      ids.length
        ? db
            .select({ methodId: methodProducts.methodId, productName: products.name })
            .from(methodProducts)
            .innerJoin(products, eq(products.id, methodProducts.productId))
            .where(inArray(methodProducts.methodId, ids))
        : Promise.resolve([]),
      ids.length
        ? db
            .select({ methodId: playbooks.methodId, count: sql<number>`count(*)::int` })
            .from(playbooks)
            .where(inArray(playbooks.methodId, ids))
            .groupBy(playbooks.methodId)
        : Promise.resolve([]),
    ]);

    const productsByMethod = new Map<string, string[]>();
    for (const row of productRows) {
      const list = productsByMethod.get(row.methodId) ?? [];
      list.push(row.productName);
      productsByMethod.set(row.methodId, list);
    }
    const playbookCountByMethod = new Map(playbookCountRows.map((r) => [r.methodId, r.count]));

    return NextResponse.json({
      methods: rows.map((m) => ({
        ...m,
        productNames: productsByMethod.get(m.id) ?? [],
        playbookCount: playbookCountByMethod.get(m.id) ?? 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os métodos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    shortDescription?: string;
    fullDescription?: string;
    category?: string;
    problemSolved?: string;
    idealClientProfile?: string;
    expectedResult?: string;
    principles?: string[];
    premises?: string[];
    successIndicators?: string[];
    risks?: string[];
    authorId?: string;
    productIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome do método é obrigatório." }, { status: 400 });
  }

  try {
    const [method] = await db
      .insert(methods)
      .values({
        slug: slugify(name),
        name,
        shortDescription: body.shortDescription?.trim() || null,
        fullDescription: body.fullDescription?.trim() || null,
        category: body.category?.trim() || null,
        problemSolved: body.problemSolved?.trim() || null,
        idealClientProfile: body.idealClientProfile?.trim() || null,
        expectedResult: body.expectedResult?.trim() || null,
        principles: body.principles?.filter(Boolean) ?? [],
        premises: body.premises?.filter(Boolean) ?? [],
        successIndicators: body.successIndicators?.filter(Boolean) ?? [],
        risks: body.risks?.filter(Boolean) ?? [],
        authorId: body.authorId || null,
      })
      .returning();

    if (body.productIds?.length) {
      await db.insert(methodProducts).values(body.productIds.map((productId) => ({ methodId: method.id, productId })));
    }

    return NextResponse.json({ method }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o método (slug já existe?)." }, { status: 500 });
  }
}
