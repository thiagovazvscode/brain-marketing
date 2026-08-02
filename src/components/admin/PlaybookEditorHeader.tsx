"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, ChevronDown, Eye, Loader2, MoreVertical, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { SaveState } from "@/components/admin/PlaybookEditor";

export const SAVE_META: Record<SaveState, { label: string; icon: React.ReactNode }> = {
  idle: { label: "Sem alterações", icon: <Check className="h-3.5 w-3.5 text-os-muted" /> },
  pending: { label: "Alterações pendentes", icon: <AlertCircle className="h-3.5 w-3.5 text-os-warning" /> },
  saving: { label: "Salvando...", icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-os-accent" /> },
  saved: { label: "Salvo agora há pouco", icon: <Check className="h-3.5 w-3.5 text-os-accent" /> },
  error: { label: "Erro ao salvar", icon: <AlertCircle className="h-3.5 w-3.5 text-os-danger" /> },
};

export function PlaybookEditorHeader({
  playbookId,
  playbookName,
  methodName,
  productName,
  version,
  status,
  saveState,
  totalStages,
  totalBlocks,
  onPreview,
  onValidate,
  onPublish,
  publishing,
}: {
  playbookId: string;
  playbookName: string;
  methodName: string | null;
  productName: string | null;
  version: string;
  status: string;
  saveState: SaveState;
  totalStages: number;
  totalBlocks: number;
  onPreview: () => void;
  onValidate: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const save = SAVE_META[saveState];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mb-5 rounded-2xl border border-os-border bg-os-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-os-muted">
            <Link
              href={`/admin/playbooks/${playbookId}`}
              aria-label="Voltar para o playbook"
              className="mr-1 flex h-5 w-5 items-center justify-center rounded-md text-os-muted hover:bg-os-bg hover:text-os-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <Link href="/admin/playbooks" className="hover:text-os-accent">
              Playbooks
            </Link>
            <span>/</span>
            <Link href={`/admin/playbooks/${playbookId}`} className="hover:text-os-accent">
              {playbookName}
            </Link>
            <span>/</span>
            <span className="font-semibold text-os-ink">Construtor</span>
          </div>

          <h1 className="truncate text-xl font-black text-os-ink">{playbookName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-os-muted">
            {methodName && <span>Método: {methodName}</span>}
            {productName && <span>Produto: {productName}</span>}
            <span>
              {totalStages} {totalStages === 1 ? "etapa" : "etapas"} · {totalBlocks} {totalBlocks === 1 ? "bloco" : "blocos"}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-os-muted">
              {save.icon} {save.label}
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-os-border px-2.5 py-1.5 text-xs font-bold text-os-ink">
              Versão {version} <ChevronDown className="h-3 w-3 text-os-muted" />
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
            >
              <Eye className="h-3.5 w-3.5" /> Visualizar
            </button>
            <button
              onClick={onValidate}
              className="flex items-center gap-1.5 rounded-lg border border-os-border px-3.5 py-2 text-xs font-bold text-os-ink hover:border-os-accent"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Validar
            </button>
            <button
              onClick={onPublish}
              disabled={publishing}
              className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-60"
            >
              {publishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publicar versão
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Mais opções"
                aria-expanded={menuOpen}
                className="flex items-center justify-center rounded-lg border border-os-border p-2 text-os-muted hover:border-os-accent hover:text-os-ink"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 z-10 mt-1 w-52 overflow-hidden rounded-lg border border-os-border bg-os-card py-1 shadow-lg"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link
                    href={`/admin/playbooks/${playbookId}`}
                    className="block px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg"
                  >
                    Ver detalhes do playbook
                  </Link>
                  <Link
                    href={`/admin/playbooks/${playbookId}/editar`}
                    className="block px-3 py-1.5 text-left text-xs text-os-ink hover:bg-os-bg"
                  >
                    Configurações do playbook
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
