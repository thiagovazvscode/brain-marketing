import { asc, eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  pipelines,
  pipelineStages,
  opportunities,
  opportunityProducts,
  products,
  adminUsers,
} from "@/db/schema";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { weightedValue } from "@/lib/crm";
import type { KanbanStage, KanbanOpportunity } from "@/types/crm";

// Server Component: os dados chegam prontos no primeiro paint, sem o waterfall
// de "baixa JS → hidrata → fetch → spinner" que deixava o painel lento.
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [defaultPipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.isDefault, true))
    .limit(1);

  // Estado esperado antes de rodar as migrations e o seed — melhor explicar o
  // que fazer do que estourar uma exceção genérica na cara do usuário.
  if (!defaultPipeline) {
    return (
      <div>
        <h1 className="text-xl font-black text-os-ink">CRM Comercial</h1>
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <p className="text-sm font-bold text-amber-900">Funil ainda não configurado</p>
          <p className="mt-2 text-sm text-amber-800">
            As tabelas do CRM já existem no código, mas o banco ainda não foi migrado. Rode, na
            pasta do projeto:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-amber-900/90 p-3 text-xs text-amber-50">
{`npm run db:generate
npm run db:push
npm run db:seed:pipeline`}
          </pre>
        </div>
      </div>
    );
  }

  const stageRows = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.pipelineId, defaultPipeline.id), eq(pipelineStages.isActive, true)))
    .orderBy(asc(pipelineStages.sortOrder));

  const oppRows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      contactName: opportunities.contactName,
      companyName: opportunities.companyName,
      phone: opportunities.phone,
      whatsapp: opportunities.whatsapp,
      email: opportunities.email,
      source: opportunities.source,
      estimatedValue: opportunities.estimatedValue,
      probability: opportunities.probability,
      priority: opportunities.priority,
      status: opportunities.status,
      stageId: opportunities.stageId,
      stageEnteredAt: opportunities.stageEnteredAt,
      nextAction: opportunities.nextAction,
      nextActionDate: opportunities.nextActionDate,
      expectedCloseDate: opportunities.expectedCloseDate,
      lostReason: opportunities.lostReason,
      ownerName: adminUsers.name,
      ownerEmail: adminUsers.email,
    })
    .from(opportunities)
    .leftJoin(adminUsers, eq(adminUsers.id, opportunities.ownerId))
    .where(eq(opportunities.pipelineId, defaultPipeline.id));

  // Produtos de interesse em uma consulta só (evita N+1 por card).
  const ids = oppRows.map((o) => o.id);
  const produtoRows = ids.length
    ? await db
        .select({ opportunityId: opportunityProducts.opportunityId, name: products.name })
        .from(opportunityProducts)
        .innerJoin(products, eq(products.id, opportunityProducts.productId))
        .where(inArray(opportunityProducts.opportunityId, ids))
    : [];

  const produtosPorOpp = new Map<string, string[]>();
  for (const row of produtoRows) {
    const list = produtosPorOpp.get(row.opportunityId) ?? [];
    list.push(row.name);
    produtosPorOpp.set(row.opportunityId, list);
  }

  const stages: KanbanStage[] = stageRows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    color: s.color,
    sortOrder: s.sortOrder,
    isWon: s.isWon,
    isLost: s.isLost,
    stuckAfterDays: s.stuckAfterDays,
    defaultProbability: s.defaultProbability,
  }));

  const opportunitiesList: KanbanOpportunity[] = oppRows.map((o) => ({
    ...o,
    stageEnteredAt: o.stageEnteredAt.toISOString(),
    productNames: produtosPorOpp.get(o.id) ?? [],
  }));

  const abertas = opportunitiesList.filter((o) => o.status === "aberta");
  const totalAberto = abertas.reduce((s, o) => s + (parseFloat(o.estimatedValue ?? "0") || 0), 0);
  const forecast = abertas.reduce((s, o) => s + weightedValue(o.estimatedValue, o.probability), 0);

  const money = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-os-ink">CRM Comercial</h1>
          <p className="text-sm text-os-muted">
            {defaultPipeline.name} · arraste os cards para mover de etapa.
          </p>
        </div>
        <div className="flex gap-5">
          <div>
            <p className="text-lg font-black tabular-nums text-os-ink">{abertas.length}</p>
            <p className="text-[11px] font-medium text-os-muted">Em aberto</p>
          </div>
          <div>
            <p className="text-lg font-black tabular-nums text-os-ink">{money(totalAberto)}</p>
            <p className="text-[11px] font-medium text-os-muted">Valor no funil</p>
          </div>
          <div>
            <p className="text-lg font-black tabular-nums text-os-accent">{money(forecast)}</p>
            <p className="text-[11px] font-medium text-os-muted">Previsão ponderada</p>
          </div>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800">
          O funil existe mas não tem etapas. Rode <code className="font-bold">npm run db:seed:pipeline</code>.
        </div>
      ) : (
        <KanbanBoard stages={stages} opportunities={opportunitiesList} />
      )}
    </div>
  );
}
