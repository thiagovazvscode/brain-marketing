"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { PlaybookValidationResult } from "@/types/methods";

export function PlaybookValidationPanel({ playbookId, versionId, refreshKey }: { playbookId: string; versionId: string; refreshKey?: number }) {
  const requestKey = `${playbookId}:${versionId}:${refreshKey ?? 0}`;
  const [result, setResult] = useState<PlaybookValidationResult | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const loading = resultKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/playbooks/${playbookId}/versions/${versionId}/validate`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setResultKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [playbookId, versionId, requestKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-os-border bg-os-card p-6 text-sm text-os-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando o playbook...
      </div>
    );
  }
  if (!result) {
    return <div className="rounded-2xl border border-os-border bg-os-card p-6 text-sm text-os-muted">Não foi possível validar.</div>;
  }

  return (
    <div className="rounded-2xl border border-os-border bg-os-card p-5">
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-os-bg/60 p-3">
          <p className="text-xl font-black text-os-ink">{result.validStages}</p>
          <p className="text-[11px] text-os-muted">Etapas válidas</p>
        </div>
        <div className="rounded-xl bg-os-bg/60 p-3">
          <p className="text-xl font-black text-os-ink">{result.validBlocks}</p>
          <p className="text-[11px] text-os-muted">Blocos válidos</p>
        </div>
        <div className="rounded-xl bg-os-bg/60 p-3">
          <p className="text-xl font-black text-os-ink">{result.adjustmentsCount}</p>
          <p className="text-[11px] text-os-muted">Ajustes necessários</p>
        </div>
      </div>

      {result.issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-os-accent-soft px-3 py-2.5 text-sm font-semibold text-os-accent">
          <CheckCircle2 className="h-4 w-4" /> Nenhum problema encontrado.
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs font-bold text-os-ink">O que precisa ser ajustado</p>
          <ul className="space-y-1.5">
            {result.issues.map((issue, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  issue.severity === "critico" ? "bg-os-danger-soft text-os-danger" : "bg-os-warning-soft text-os-warning"
                }`}
              >
                {issue.severity === "critico" ? (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!result.canPublish && (
        <p className="mt-3 text-xs font-semibold text-os-danger">Publicação bloqueada até resolver os erros críticos.</p>
      )}
    </div>
  );
}
