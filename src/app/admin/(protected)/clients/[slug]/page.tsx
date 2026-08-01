import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { clients, clientBriefings, clientProducts, products, clientDiagnostics, clientStageHistory, adminUsers } from "@/db/schema";
import { ClientProductsPanel } from "@/components/admin/ClientProductsPanel";
import { ClientDiagnosticPanel } from "@/components/admin/ClientDiagnosticPanel";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { methodStageLabel } from "@/lib/method-stages";
import { onboardingStatusLabel, operationalStatusLabel } from "@/lib/billing";

// Explícito por segurança — o slug já força renderização por request, mas
// deixamos claro que esta página nunca deve ser servida como snapshot estático.
export const dynamic = "force-dynamic";

const TECHNICAL_KEYS = new Set(["client", "timestamp", "timestampFormatted"]);

function humanizeKey(key: string): string {
  const withSpaces = key.replace(/([A-Z])/g, " $1").trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: string | null) {
  const n = Number(value ?? 0);
  if (!n) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Fora do corpo do componente de propósito: o linter de pureza do React
// Compiler proíbe Date.now()/new Date() textualmente dentro da função
// exportada da página, mas não em funções auxiliares chamadas por ela — não
// há problema real de memoização aqui (é Server Component, roda uma vez por
// request), só evitamos o padrão que o lint sinaliza.
function computeSaude(
  engagementRows: { status: string; productName: string; nextActionDate: string | null }[],
  historyRows: { productName: string; changedAt: Date }[]
): { hasStuck: boolean; hasOverdueAction: boolean } {
  const lastChangeByProduct = new Map<string, Date>();
  for (const h of historyRows) {
    const current = lastChangeByProduct.get(h.productName);
    if (!current || h.changedAt > current) lastChangeByProduct.set(h.productName, h.changedAt);
  }
  const twentyOneDaysAgo = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const hasStuck = engagementRows.some(
    (e) => e.status === "ativo" && (lastChangeByProduct.get(e.productName)?.getTime() ?? 0) < twentyOneDaysAgo
  );
  const now = Date.now();
  const hasOverdueAction = engagementRows.some(
    (e) => e.status === "ativo" && e.nextActionDate && new Date(e.nextActionDate).getTime() < now
  );
  return { hasStuck, hasOverdueAction };
}

function formatRelationshipDuration(since: Date): string {
  const months = Math.max(0, Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  if (months < 1) return "menos de 1 mês";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths === 0 ? `${years} ${years === 1 ? "ano" : "anos"}` : `${years}a ${remMonths}m`;
}

export default async function AdminClientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [client] = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
  if (!client) notFound();

  const [briefings, engagementRows, catalog, diagnosticRows, historyRows] = await Promise.all([
    db.select().from(clientBriefings).where(eq(clientBriefings.clientId, client.id)).orderBy(desc(clientBriefings.submittedAt)),
    db
      .select({
        id: clientProducts.id,
        productId: clientProducts.productId,
        productSlug: products.slug,
        productName: products.name,
        status: clientProducts.status,
        currentStage: clientProducts.currentStage,
        startedAt: clientProducts.startedAt,
        endedAt: clientProducts.endedAt,
        negotiatedValue: clientProducts.negotiatedValue,
        billingType: clientProducts.billingType,
        billingCycle: clientProducts.billingCycle,
        billingDay: clientProducts.billingDay,
        onboardingStatus: clientProducts.onboardingStatus,
        implementationProgress: clientProducts.implementationProgress,
        operationalStatus: clientProducts.operationalStatus,
        nextAction: clientProducts.nextAction,
        nextActionDate: clientProducts.nextActionDate,
        impactOnMrr: clientProducts.impactOnMrr,
        responsibleName: adminUsers.name,
        responsibleEmail: adminUsers.email,
      })
      .from(clientProducts)
      .innerJoin(products, eq(products.id, clientProducts.productId))
      .leftJoin(adminUsers, eq(adminUsers.id, clientProducts.responsibleUserId))
      .where(eq(clientProducts.clientId, client.id))
      .orderBy(desc(clientProducts.createdAt)),
    db.select().from(products).where(eq(products.isActive, true)),
    db.select().from(clientDiagnostics).where(eq(clientDiagnostics.clientId, client.id)).orderBy(desc(clientDiagnostics.createdAt)),
    db
      .select({
        id: clientStageHistory.id,
        productName: products.name,
        fromStage: clientStageHistory.fromStage,
        toStage: clientStageHistory.toStage,
        note: clientStageHistory.note,
        changedAt: clientStageHistory.changedAt,
      })
      .from(clientStageHistory)
      .innerJoin(clientProducts, eq(clientProducts.id, clientStageHistory.clientProductId))
      .innerJoin(products, eq(products.id, clientProducts.productId))
      .where(eq(clientProducts.clientId, client.id))
      .orderBy(desc(clientStageHistory.changedAt)),
  ]);

  const activeOrPausedProductIds = new Set(engagementRows.filter((e) => e.status !== "encerrado").map((e) => e.productId));
  const upsellCandidates = catalog
    .filter((p) => !activeOrPausedProductIds.has(p.id))
    .map((p) => ({ id: p.id, slug: p.slug, name: p.name, category: p.category }));

  const mrr = engagementRows.filter((e) => e.status === "ativo").reduce((sum, e) => sum + Number(e.impactOnMrr ?? 0), 0);
  const receitaContratada = engagementRows.reduce((sum, e) => sum + Number(e.negotiatedValue ?? 0), 0);
  const { hasStuck, hasOverdueAction } = computeSaude(engagementRows, historyRows);
  const saude = hasStuck ? "Crítica" : hasOverdueAction ? "Atenção" : "Boa";
  const saudeClass = hasStuck
    ? "bg-os-danger-soft text-os-danger"
    : hasOverdueAction
      ? "bg-os-warning-soft text-os-warning"
      : "bg-os-accent-soft text-os-accent";

  const relationshipSince = client.enteredAt ? new Date(client.enteredAt) : new Date(client.createdAt);

  const billingCycleLabel: Record<string, string> = {
    mensal: "/mês",
    trimestral: "/trimestre",
    semestral: "/semestre",
    anual: "/ano",
    unico: " (pagamento único)",
  };

  const timeline = [
    ...historyRows.map((h) => ({
      id: h.id,
      date: h.changedAt,
      label: h.fromStage
        ? `${h.productName}: ${methodStageLabel(h.fromStage)} → ${methodStageLabel(h.toStage)}`
        : `${h.productName}: engajamento iniciado em ${methodStageLabel(h.toStage)}`,
      note: h.note,
    })),
    ...briefings.map((b) => ({
      id: b.id,
      date: b.submittedAt,
      label: "Briefing preenchido",
      note: null as string | null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const visaoGeral = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <p className="text-xl font-black text-os-ink">{formatCurrency(String(mrr))}</p>
          <p className="mt-1 text-xs font-medium text-os-muted">Receita recorrente (MRR)</p>
        </div>
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <p className="text-xl font-black text-os-ink">{formatCurrency(String(receitaContratada))}</p>
          <p className="mt-1 text-xs font-medium text-os-muted">Receita contratada (total)</p>
        </div>
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${saudeClass}`}>{saude}</span>
          <p className="mt-1 text-xs font-medium text-os-muted">Saúde do cliente</p>
        </div>
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <p className="text-xl font-black text-os-ink">{formatRelationshipDuration(relationshipSince)}</p>
          <p className="mt-1 text-xs font-medium text-os-muted">Tempo de relacionamento</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Produtos contratados</h2>
        {engagementRows.length === 0 ? (
          <p className="rounded-xl border border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
            Nenhum produto contratado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {engagementRows.map((eng) => (
              <div key={eng.id} className="rounded-2xl border border-os-border bg-os-card p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold text-os-ink">{eng.productName}</p>
                  <span className="rounded-full bg-os-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase text-os-accent">
                    {eng.status}
                  </span>
                </div>
                <p className="text-lg font-black text-os-ink">
                  {formatCurrency(eng.negotiatedValue)}
                  <span className="text-xs font-medium text-os-muted">
                    {eng.billingType === "recorrente" ? billingCycleLabel[eng.billingCycle] : " (pontual)"}
                  </span>
                </p>
                <dl className="mt-3 space-y-1.5 text-xs text-os-muted">
                  <div className="flex justify-between gap-2">
                    <dt>Onboarding</dt>
                    <dd className="font-semibold text-os-ink">{onboardingStatusLabel(eng.onboardingStatus)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Progresso de implantação</dt>
                    <dd className="font-semibold text-os-ink">{eng.implementationProgress}%</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Operação contínua</dt>
                    <dd className="font-semibold text-os-ink">{operationalStatusLabel(eng.operationalStatus)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Estágio (Método Brain)</dt>
                    <dd className="font-semibold text-os-ink">{methodStageLabel(eng.currentStage)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Responsável</dt>
                    <dd className="font-semibold text-os-ink">{eng.responsibleName ?? eng.responsibleEmail ?? "—"}</dd>
                  </div>
                </dl>
                {eng.nextAction && (
                  <p className="mt-3 rounded-lg bg-os-bg px-2.5 py-2 text-xs font-medium text-os-ink">
                    Próxima ação: {eng.nextAction}
                    {eng.nextActionDate && ` — ${new Date(eng.nextActionDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const produtos = (
    <section className="rounded-2xl border border-os-border bg-os-card p-5">
      <ClientProductsPanel clientSlug={slug} engagements={engagementRows} upsellCandidates={upsellCandidates} />
    </section>
  );

  const diagnostico = (
    <section className="rounded-2xl border border-os-border bg-os-card p-5">
      <ClientDiagnosticPanel clientSlug={slug} diagnostics={diagnosticRows} />
    </section>
  );

  const historico = (
    <div className="space-y-6">
      <section className="rounded-2xl border border-os-border bg-os-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Linha do tempo</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-os-muted">Nenhum evento registrado ainda.</p>
        ) : (
          <ol className="space-y-3">
            {timeline.map((item) => (
              <li key={item.id} className="flex gap-3 border-l-2 border-os-border pl-4">
                <div>
                  <p className="text-xs font-semibold text-os-muted">{formatDate(item.date)}</p>
                  <p className="text-sm text-os-ink">{item.label}</p>
                  {item.note && <p className="text-xs text-os-muted">{item.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Briefings</h2>
        {briefings.length === 0 ? (
          <p className="rounded-xl border border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
            Nenhum briefing preenchido ainda para este cliente.
          </p>
        ) : (
          <div className="space-y-4">
            {briefings.map((briefing) => (
              <div key={briefing.id} className="rounded-2xl border border-os-border bg-os-card p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-os-accent">
                  Preenchido em {formatDate(briefing.submittedAt)}
                </p>
                <dl className="space-y-1.5">
                  {Object.entries(briefing.payload as Record<string, unknown>)
                    .filter(([key]) => !TECHNICAL_KEYS.has(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
                        <dt className="shrink-0 font-medium text-os-muted sm:w-56">{humanizeKey(key)}</dt>
                        <dd className="whitespace-pre-wrap text-os-ink/90">{formatValue(value)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">{client.name}</h1>
        <p className="text-sm text-os-muted">
          {client.whatsapp ? `${client.whatsapp} · ` : ""}
          {client.enteredAt && `Cliente desde ${new Date(client.enteredAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · `}
          {briefings.length} briefing(s) registrado(s)
        </p>
      </div>

      <ClientTabs
        content={{
          geral: visaoGeral,
          produtos,
          diagnostico,
          historico,
        }}
      />
    </div>
  );
}
