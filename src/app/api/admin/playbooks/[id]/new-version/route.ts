import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { ensureDraftVersion } from "@/lib/playbook-builder";

// Ação explícita "Nova versão" do detalhe do playbook (item 9) — mesma regra
// de ensureDraftVersion usada pelo construtor (Fase 2.1): abre (ou
// reaproveita) o rascunho da próxima versão, já como linha endereçável em
// playbookVersions. Não grava snapshot além do que ensureDraftVersion já
// grava: o publish() já registrou o estado publicado vigente.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(playbooks).where(eq(playbooks.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });
    if (existing.status !== "publicado") {
      return NextResponse.json(
        { error: "Só é possível criar uma nova versão a partir de um playbook publicado." },
        { status: 400 }
      );
    }

    const result = await ensureDraftVersion(id);
    if (!result) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });

    return NextResponse.json({ playbook: result.playbook });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a nova versão." }, { status: 500 });
  }
}
