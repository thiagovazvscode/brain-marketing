import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
    return NextResponse.json({ products: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o catálogo." }, { status: 500 });
  }
}
