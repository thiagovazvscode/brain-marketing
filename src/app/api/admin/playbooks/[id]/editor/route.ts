import { NextResponse } from "next/server";
import { getEditableVersion } from "@/lib/playbook-builder";
import { getPlaybookEditorData } from "@/lib/methods-data";

// Somente leitura: devolve o payload do rascunho já aberto. Nunca cria
// versão — esse GET é usado pelo refetch() do construtor depois de cada
// salvamento, e uma rota GET não pode ter efeito colateral no banco. Criar
// rascunho é responsabilidade exclusiva do POST .../new-version, disparado
// por confirmação explícita do usuário (ver PlaybookDraftGate).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await getEditableVersion(id);
    if (!result) return NextResponse.json({ error: "Playbook não encontrado." }, { status: 404 });
    if (!result.version) {
      return NextResponse.json({ error: "Este playbook não possui rascunho ativo." }, { status: 409 });
    }

    const data = await getPlaybookEditorData(id, result.version.id);
    if (!data) return NextResponse.json({ error: "Não foi possível carregar o construtor." }, { status: 404 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir o construtor." }, { status: 500 });
  }
}
