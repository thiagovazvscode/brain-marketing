import { getPlaybooksSummary } from "@/lib/methods-data";
import { PlaybooksLibrary } from "@/components/admin/PlaybooksLibrary";

export const dynamic = "force-dynamic";

export default async function PlaybooksBibliotecaPage() {
  const playbooks = await getPlaybooksSummary();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Biblioteca de Playbooks</h1>
        <p className="text-sm text-os-muted">Playbooks derivados dos métodos da Brain — modelos configuráveis, ainda não aplicados a clientes.</p>
      </div>
      <PlaybooksLibrary playbooks={playbooks} />
    </div>
  );
}
