import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { isValidResourceType, isValidResourceUrl } from "@/lib/methods";

// Estrutura inicial (item 3/4 do pedido) — sem CRUD completo nesta etapa,
// só o suficiente para listar e cadastrar um recurso simples por método ou
// playbook.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const methodId = searchParams.get("methodId");
  const playbookId = searchParams.get("playbookId");
  const type = searchParams.get("type");

  try {
    const conditions = [];
    if (methodId) conditions.push(eq(resources.methodId, methodId));
    if (playbookId) conditions.push(eq(resources.playbookId, playbookId));
    if (type && isValidResourceType(type)) conditions.push(eq(resources.type, type));

    const rows = await db
      .select()
      .from(resources)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(resources.updatedAt));

    return NextResponse.json({ resources: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os recursos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    title?: string;
    type?: string;
    url?: string;
    description?: string;
    methodId?: string;
    playbookId?: string;
    authorId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Título do recurso é obrigatório." }, { status: 400 });
  if (body.type && !isValidResourceType(body.type)) {
    return NextResponse.json({ error: "Tipo de recurso inválido." }, { status: 400 });
  }
  if (body.url && !isValidResourceUrl(body.url)) {
    return NextResponse.json({ error: "Link inválido — use apenas endereços http:// ou https://." }, { status: 400 });
  }
  if (!body.methodId && !body.playbookId) {
    return NextResponse.json({ error: "Informe o método ou o playbook do recurso." }, { status: 400 });
  }

  try {
    const [resource] = await db
      .insert(resources)
      .values({
        title,
        type: body.type || "outro",
        url: body.url?.trim() || null,
        description: body.description?.trim() || null,
        methodId: body.methodId || null,
        playbookId: body.playbookId || null,
        authorId: body.authorId || null,
      })
      .returning();
    return NextResponse.json({ resource }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o recurso." }, { status: 500 });
  }
}
