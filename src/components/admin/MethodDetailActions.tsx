"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function MethodDetailActions({ methodId, status }: { methodId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "archive" | "duplicate" | null>(null);

  async function run(action: "publish" | "archive" | "duplicate") {
    setBusy(action);
    try {
      const response = await fetch(`/api/admin/methods/${methodId}/${action}`, { method: "POST" });
      const data = await response.json();
      if (action === "duplicate" && response.ok) {
        router.push(`/admin/metodos/${data.method.id}/editar`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/metodos/${methodId}/editar`}
        className="rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
      >
        Editar
      </Link>
      <Link
        href={`/admin/playbooks/novo?methodId=${methodId}`}
        className="rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
      >
        Criar playbook
      </Link>
      <button
        onClick={() => run("duplicate")}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent disabled:opacity-60"
      >
        {busy === "duplicate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Duplicar
      </button>
      {status !== "publicado" && status !== "arquivado" && (
        <button
          onClick={() => run("publish")}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy === "publish" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publicar
        </button>
      )}
      {status !== "arquivado" && (
        <button
          onClick={() => run("archive")}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-red-600 hover:border-red-300 disabled:opacity-60"
        >
          {busy === "archive" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Arquivar
        </button>
      )}
    </div>
  );
}
