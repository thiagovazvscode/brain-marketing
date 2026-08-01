"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import type { KanbanStage, KanbanOpportunity } from "@/types/crm";
import { KanbanCard } from "./KanbanCard";
import { LossReasonDialog } from "./LossReasonDialog";
import { OpportunityDetailPanel } from "./OpportunityDetailPanel";
import { NewOpportunityForm } from "./NewOpportunityForm";

// Drag and drop com a API nativa do HTML5, sem biblioteca.
//
// Escolha deliberada: um Kanban de colunas só precisa de "peguei este card" e
// "soltei nesta coluna", que dragstart/dragover/drop já resolvem. Trazer
// @dnd-kit adicionaria dependência, bundle e um `npm install` no meio da
// entrega — sem ganho real neste caso. Se algum dia precisar de reordenação
// dentro da coluna com animação, aí sim vale a troca.
export function KanbanBoard({
  stages,
  opportunities: initial,
}: {
  stages: KanbanStage[];
  opportunities: KanbanOpportunity[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [lossTarget, setLossTarget] = useState<{ oppId: string; stageId: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creatingInStage, setCreatingInStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<string, KanbanOpportunity[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const opp of items) {
      const list = map.get(opp.stageId);
      if (list) list.push(opp);
    }
    return map;
  }, [items, stages]);

  async function moveTo(oppId: string, stageId: string, lossReason?: string, lostNotes?: string) {
    const opp = items.find((o) => o.id === oppId);
    if (!opp || opp.stageId === stageId) return;

    const previousStageId = opp.stageId;
    // Otimista: o card pula de coluna na hora. Se a API recusar, volta.
    setItems((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, stageId, stageEnteredAt: new Date().toISOString() } : o))
    );
    setMovingId(oppId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/opportunities/${oppId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, lostReason: lossReason, lostNotes }),
      });
      const data = await res.json();

      if (!res.ok) {
        setItems((prev) => prev.map((o) => (o.id === oppId ? { ...o, stageId: previousStageId } : o)));
        if (data.requiresLossReason) {
          setLossTarget({ oppId, stageId });
        } else {
          setError(data.error ?? "Não foi possível mover a oportunidade.");
        }
        return;
      }

      if (data.requiresConversion) {
        // Etapa "Fechado" não fecha sozinha — o wizard de contratação (2.5)
        // é quem cria cliente, contratação e MRR.
        setError(
          "Oportunidade movida para Fechado. O fluxo de contratação (criar cliente e produtos) entra na Etapa 2.5."
        );
      }
      router.refresh();
    } catch {
      setItems((prev) => prev.map((o) => (o.id === oppId ? { ...o, stageId: previousStageId } : o)));
      setError("Falha de conexão ao mover a oportunidade.");
    } finally {
      setMovingId(null);
    }
  }

  const totalPorEtapa = (stageId: string) =>
    (byStage.get(stageId) ?? []).reduce((sum, o) => sum + (parseFloat(o.estimatedValue ?? "0") || 0), 0);

  return (
    <>
      {error && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold underline">
            fechar
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const cards = byStage.get(stage.id) ?? [];
          const total = totalPorEtapa(stage.id);
          const isOver = overStage === stage.id;

          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverStage(stage.id);
              }}
              onDragLeave={() => setOverStage((cur) => (cur === stage.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || draggingId;
                setOverStage(null);
                setDraggingId(null);
                if (!id) return;
                if (stage.isLost) {
                  setLossTarget({ oppId: id, stageId: stage.id });
                  return;
                }
                moveTo(id, stage.id);
              }}
              className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition ${
                isOver ? "border-os-accent bg-os-accent-soft/40" : "border-os-border bg-os-bg/60"
              }`}
            >
              <header className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                  />
                  <h3 className="truncate text-sm font-bold text-os-ink">{stage.name}</h3>
                  <span className="shrink-0 rounded-full bg-os-card px-1.5 text-[11px] font-bold text-os-muted">
                    {cards.length}
                  </span>
                </div>
                <button
                  onClick={() => setCreatingInStage(stage.id)}
                  title="Nova oportunidade nesta etapa"
                  className="shrink-0 rounded-md p-1 text-os-muted transition hover:bg-os-card hover:text-os-ink"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </header>

              {total > 0 && (
                <p className="mb-2 text-[11px] font-semibold tabular-nums text-os-muted">
                  {total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </p>
              )}

              <div className="flex min-h-24 flex-col gap-2">
                {cards.map((opp) => (
                  <div key={opp.id} className={movingId === opp.id ? "opacity-50" : ""}>
                    <KanbanCard
                      opportunity={opp}
                      stuckAfterDays={stage.stuckAfterDays}
                      onDragStart={setDraggingId}
                      onClick={setDetailId}
                    />
                  </div>
                ))}

                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed border-os-border px-2 py-6 text-center text-[11px] text-os-muted">
                    Arraste um card para cá
                  </p>
                )}
              </div>

              {movingId && cards.some((c) => c.id === movingId) && (
                <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-os-muted" />
              )}
            </section>
          );
        })}
      </div>

      {lossTarget && (
        <LossReasonDialog
          onCancel={() => setLossTarget(null)}
          onConfirm={(reason, notes) => {
            const target = lossTarget;
            setLossTarget(null);
            moveTo(target.oppId, target.stageId, reason, notes);
          }}
        />
      )}

      {detailId && <OpportunityDetailPanel opportunityId={detailId} onClose={() => setDetailId(null)} />}

      {creatingInStage && (
        <NewOpportunityForm
          stageId={creatingInStage}
          onClose={() => setCreatingInStage(null)}
          onCreated={() => {
            setCreatingInStage(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
