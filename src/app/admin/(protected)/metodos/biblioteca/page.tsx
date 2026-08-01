import { getMethodsSummary } from "@/lib/methods-data";
import { MethodsLibrary } from "@/components/admin/MethodsLibrary";

export const dynamic = "force-dynamic";

export default async function MethodsBibliotecaPage() {
  const methods = await getMethodsSummary();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Biblioteca de Métodos</h1>
        <p className="text-sm text-os-muted">Métodos cadastrados pela Brain — modelos configuráveis, ainda não aplicados a clientes.</p>
      </div>
      <MethodsLibrary methods={methods} />
    </div>
  );
}
