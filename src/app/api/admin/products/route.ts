import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
    return NextResponse.json({ products: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o catálogo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { name?: string; shortDescription?: string; category?: string; isEntryProduct?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome do produto é obrigatório." }, { status: 400 });
  }

  try {
    const [product] = await db
      .insert(products)
      .values({
        slug: slugify(name),
        name,
        shortDescription: body.shortDescription?.trim() || null,
        category: body.category?.trim() || null,
        isEntryProduct: body.isEntryProduct ?? false,
      })
      .returning();
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o produto (slug já existe?)." }, { status: 500 });
  }
}
