import { ListTree, Plus } from "lucide-react";

// "Este playbook ainda não possui etapas" — não copia macroetapas do método
// automaticamente (regra explícita do pedido: sem confirmação, não copia).
export function EmptyStagePlaceholder({ onCreate, onUseMethod }: { onCreate: () => void; onUseMethod?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-os-border bg-os-card/40 px-6 py-16 text-center">
      <ListTree className="h-8 w-8 text-os-muted/60" />
      <p className="mt-3 text-sm font-bold text-os-ink">Este playbook ainda não possui etapas.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-xs font-bold text-white hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Criar primeira etapa
        </button>
        {onUseMethod && (
          <button
            onClick={onUseMethod}
            className="rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
          >
            Usar estrutura do método como referência
          </button>
        )}
      </div>
    </div>
  );
}
