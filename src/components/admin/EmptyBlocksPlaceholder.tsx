import { ClipboardList, Plus, Send } from "lucide-react";

export function EmptyBlocksPlaceholder({
  onAddInternalTask,
  onAddClientRequest,
}: {
  onAddInternalTask: () => void;
  onAddClientRequest: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-os-border bg-os-card/40 px-6 py-10 text-center">
      <ClipboardList className="h-7 w-7 text-os-muted/60" />
      <p className="mt-3 text-sm font-bold text-os-ink">Esta etapa ainda não possui blocos operacionais.</p>
      <p className="mt-1 max-w-sm text-xs text-os-muted">
        Adicione atividades da equipe ou solicitações ao cliente para estruturar a execução desta etapa.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={onAddInternalTask}
          className="flex items-center gap-1.5 rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar tarefa interna
        </button>
        <button
          onClick={onAddClientRequest}
          className="flex items-center gap-1.5 rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
        >
          <Send className="h-3.5 w-3.5" /> Adicionar solicitação ao cliente
        </button>
      </div>
    </div>
  );
}
