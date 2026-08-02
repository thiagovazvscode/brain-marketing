import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { getEditableVersion } from "@/lib/playbook-builder";
import { getPlaybookEditorData } from "@/lib/methods-data";
import { PlaybookEditor } from "@/components/admin/PlaybookEditor";
import { PlaybookDraftGate } from "@/components/admin/PlaybookDraftGate";

export const dynamic = "force-dynamic";

// Somente leitura: nunca cria versão aqui. Se já existe rascunho, carrega o
// construtor sobre ele. Se o playbook está publicado (ou arquivado) e não
// tem rascunho, mostra a tela de confirmação — criar a versão é uma ação
// POST explícita do usuário (ver PlaybookDraftGate), nunca efeito de GET,
// render, prefetch ou crawler.
export default async function PlaybookEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await getEditableVersion(id);
  if (!result) notFound();

  if (!result.version) {
    return <PlaybookDraftGate playbookId={id} playbookName={result.playbook.name} status={result.playbook.status} />;
  }

  const [data, authorRows] = await Promise.all([
    getPlaybookEditorData(id, result.version.id),
    db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).orderBy(asc(adminUsers.name)),
  ]);
  if (!data) notFound();

  return (
    <PlaybookEditor
      key={data.version.id}
      initialData={data}
      assigneeOptions={authorRows.map((a) => ({ id: a.id, name: a.name ?? a.email }))}
    />
  );
}
