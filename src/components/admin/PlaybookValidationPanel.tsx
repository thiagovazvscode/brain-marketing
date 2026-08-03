"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X, XCircle } from "lucide-react";
import type { PlaybookValidationResult, ValidationIssue } from "@/types/methods";

const VALIDATE_TIMEOUT_MS = 15000;
const GENERIC_ERROR_MESSAGE = "Não foi possível validar o playbook.";

type PanelState = "idle" | "loading" | "success_with_issues" | "success_without_issues" | "error";

function deriveState(loading: boolean, errorMessage: string | null, result: PlaybookValidationResult | null): PanelState {
  if (loading) return "loading";
  if (errorMessage) return "error";
  if (!result) return "idle";
  return result.issues.length > 0 ? "success_with_issues" : "success_without_issues";
}

/**
 * Máquina de estados da validação: idle (nunca disparou) → loading (request
 * em voo) → success_with_issues | success_without_issues | error. Nunca fica
 * preso em loading: toda promise termina em setResult/setErrorMessage dentro
 * de um finally, mesmo em abort/timeout/erro de rede/resposta não-JSON.
 */
function useValidation(playbookId: string, versionId: string, refreshKey: number | undefined) {
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = `${playbookId}:${versionId}:${refreshKey ?? 0}:${retryCount}`;
  const [result, setResult] = useState<PlaybookValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // "loading" é derivado (settledKey !== requestKey), nunca setState direto
  // no corpo do efeito — evita disparo duplicado da mesma requisição
  // enquanto ela ainda está em voo (retry fica sem efeito até settledKey
  // alcançar o requestKey atual).
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const loading = settledKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(`/api/admin/playbooks/${playbookId}/versions/${versionId}/validate`, { signal: controller.signal });
        if (!res.ok) {
          let message = `Não foi possível validar (HTTP ${res.status}).`;
          try {
            const data = await res.json();
            if (data?.error) message = data.error;
          } catch {
            // resposta não era JSON (ex.: página de erro do servidor) — mantém a mensagem genérica com o status.
          }
          throw new Error(message);
        }
        const data = (await res.json()) as PlaybookValidationResult;
        if (cancelled) return;
        setResult(data);
        setErrorMessage(null);
      } catch (err) {
        if (cancelled) return;
        // A mensagem exibida ao usuário é sempre a genérica em PT-BR (pedido
        // explícito) — o detalhe técnico (status HTTP, "Failed to fetch" do
        // browser em inglês etc.) fica só no console, não na UI.
        if (err instanceof Error && err.name === "AbortError") {
          console.error("[PlaybookValidation] timeout ao validar", err);
        } else {
          console.error("[PlaybookValidation] falha ao validar", err);
        }
        setResult(null);
        setErrorMessage(GENERIC_ERROR_MESSAGE);
      } finally {
        // loading sempre encerra aqui, sucesso ou erro — nunca fica preso.
        if (!cancelled) setSettledKey(requestKey);
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const state = deriveState(loading, errorMessage, result);
  return {
    state,
    result,
    errorMessage,
    // Ignorado enquanto uma requisição já está em voo — impede requisição
    // duplicada se o usuário conseguir clicar "Tentar novamente" mais de
    // uma vez (o botão já some durante loading, isto é uma segunda trava).
    retry: () => {
      if (!loading) setRetryCount((c) => c + 1);
    },
  };
}

function ValidationBody({
  state,
  result,
  errorMessage,
  onRetry,
  onSelectIssue,
}: {
  state: PanelState;
  result: PlaybookValidationResult | null;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectIssue?: (issue: ValidationIssue) => void;
}) {
  if (state === "idle" || state === "loading") {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-os-muted" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando o playbook...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-os-danger-soft p-4 text-sm text-os-danger" role="alert">
        <div className="flex items-start gap-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-os-danger/30 px-3 py-1.5 text-xs font-bold text-os-danger hover:bg-os-danger/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <>
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

      {state === "success_without_issues" ? (
        <div className="flex items-center gap-2 rounded-xl bg-os-accent-soft px-3 py-2.5 text-sm font-semibold text-os-accent">
          <CheckCircle2 className="h-4 w-4" /> Nenhum problema encontrado.
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs font-bold text-os-ink">O que precisa ser ajustado</p>
          <ul className="space-y-1.5">
            {result.issues.map((issue, i) => {
              const clickable = Boolean(onSelectIssue && issue.stageId);
              const content = (
                <>
                  {issue.severity === "critico" ? (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  {issue.message}
                </>
              );
              const className = `flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                issue.severity === "critico" ? "bg-os-danger-soft text-os-danger" : "bg-os-warning-soft text-os-warning"
              } ${clickable ? "cursor-pointer hover:brightness-95" : ""}`;
              return (
                <li key={i}>
                  {clickable ? (
                    <button className={className} onClick={() => onSelectIssue!(issue)}>
                      {content}
                    </button>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!result.canPublish && <p className="mt-3 text-xs font-semibold text-os-danger">Publicação bloqueada até resolver os erros críticos.</p>}
    </>
  );
}

// Uso inline (aba "Validação" da página de detalhe do playbook) — sem modal,
// sem onClose, card simples como sempre foi.
export function PlaybookValidationPanel({
  playbookId,
  versionId,
  refreshKey,
  onSelectIssue,
}: {
  playbookId: string;
  versionId: string;
  refreshKey?: number;
  onSelectIssue?: (issue: ValidationIssue) => void;
}) {
  const { state, result, errorMessage, retry } = useValidation(playbookId, versionId, refreshKey);
  return (
    <div className="rounded-2xl border border-os-border bg-os-card p-5">
      <ValidationBody state={state} result={result} errorMessage={errorMessage} onRetry={retry} onSelectIssue={onSelectIssue} />
    </div>
  );
}

// Uso no Construtor — modal com título fixo, corpo rolável e "Fechar" preso
// no rodapé (nunca como barra solta abaixo do card).
export function PlaybookValidationModal({
  playbookId,
  versionId,
  refreshKey,
  onSelectIssue,
  onClose,
}: {
  playbookId: string;
  versionId: string;
  refreshKey?: number;
  onSelectIssue?: (issue: ValidationIssue) => void;
  onClose: () => void;
}) {
  const { state, result, errorMessage, retry } = useValidation(playbookId, versionId, refreshKey);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Foco inicial no botão Fechar do rodapé — navegação por teclado entra no
  // modal já num controle interativo, sem depender de tab a partir do body.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-os-border bg-os-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Validação do Playbook"
      >
        <div className="flex items-center justify-between gap-3 border-b border-os-border p-5">
          <h3 className="text-base font-black text-os-ink">Validação do Playbook</h3>
          <button onClick={onClose} className="text-os-muted hover:text-os-ink" aria-label="Fechar validação">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <ValidationBody state={state} result={result} errorMessage={errorMessage} onRetry={retry} onSelectIssue={onSelectIssue} />
        </div>

        <div className="flex shrink-0 justify-end border-t border-os-border p-4">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-os-muted hover:bg-os-bg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
