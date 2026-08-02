"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

// Tela mostrada quando o playbook não tem rascunho aberto (publicado ou
// arquivado). Criar a versão é ação explícita do usuário — POST em
// .../new-version — nunca efeito de carregar esta página. Depois de criar,
// router.refresh() reexecuta o Server Component do editor, que agora acha o
// rascunho e renderiza o construtor normalmente, sem navegação extra.
export function PlaybookDraftGate({
  playbookId,
  playbookName,
  status,
}: {
  playbookId: string;
  playbookName: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDraft() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/playbooks/${playbookId}/new-version`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar a nova versão.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a nova versão.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-os-border bg-os-card/30 p-16 text-center">
      <Lock className="h-8 w-8 text-os-muted" />
      <div>
        <p className="text-sm font-bold text-os-ink">
          {status === "publicado"
            ? "Este playbook está publicado e protegido contra edição."
            : "Este playbook está arquivado e protegido contra edição."}
        </p>
        <p className="mt-1 text-xs text-os-muted">{playbookName}</p>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <button
        onClick={createDraft}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg bg-os-accent px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Criar nova versão para editar
      </button>
    </div>
  );
}
