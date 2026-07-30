import { NextResponse } from "next/server";
import { db } from "@/db";
import { pixelConfigs, pixelProviderEnum } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(pixelConfigs);
    return NextResponse.json({ pixels: rows });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os pixels." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { pagePath?: string; provider?: string; pixelId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const validProviders = pixelProviderEnum.enumValues;
  if (
    !body.pagePath ||
    !body.pixelId?.trim() ||
    !validProviders.includes(body.provider as (typeof validProviders)[number])
  ) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes ou inválidos." }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(pixelConfigs)
      .values({
        pagePath: body.pagePath,
        provider: body.provider as (typeof validProviders)[number],
        pixelId: body.pixelId.trim(),
      })
      .returning();

    return NextResponse.json({ pixel: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o pixel." }, { status: 500 });
  }
}
