import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { clients, clientBriefings, clientProducts, products, clientDiagnostics } from "@/db/schema";
import { ClientProductsPanel } from "@/components/admin/ClientProductsPanel";
import { ClientDiagnosticPanel } from "@/components/admin/ClientDiagnosticPanel";

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

export default async function AdminClientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [client] = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
  if (!client) notFound();

  const [briefings, engagementRows, catalog, diagnosticRows] = await Promise.all([
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
      })
      .from(clientProducts)
      .innerJoin(products, eq(products.id, clientProducts.productId))
      .where(eq(clientProducts.clientId, client.id))
      .orderBy(desc(clientProducts.createdAt)),
    db.select().from(products).where(eq(products.isActive, true)),
    db.select().from(clientDiagnostics).where(eq(clientDiagnostics.clientId, client.id)).orderBy(desc(clientDiagnostics.createdAt)),
  ]);

  const activeOrPausedProductIds = new Set(engagementRows.filter((e) => e.status !== "encerrado").map((e) => e.productId));
  const upsellCandidates = catalog
    .filter((p) => !activeOrPausedProductIds.has(p.id))
    .map((p) => ({ id: p.id, slug: p.slug, name: p.name, category: p.category }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-ink">{client.name}</h1>
        <p className="text-sm text-muted">
          {client.whatsapp ? `${client.whatsapp} · ` : ""}
          {client.enteredAt && `Cliente desde ${new Date(client.enteredAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · `}
          {briefings.length} briefing(s) registrado(s)
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-elevated/40 p-5">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-ink">Produtos</h2>
          <ClientProductsPanel
            clientSlug={slug}
            engagements={engagementRows}
            upsellCandidates={upsellCandidates}
          />
        </section>

        <section className="rounded-2xl border border-line bg-elevated/40 p-5">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-ink">Diagnóstico</h2>
          <ClientDiagnosticPanel clientSlug={slug} diagnostics={diagnosticRows} />
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink">Briefings</h2>
          {briefings.length === 0 && (
            <p className="rounded-xl border border-line bg-elevated/30 px-4 py-6 text-center text-sm text-muted">
              Nenhum briefing preenchido ainda para este cliente.
            </p>
          )}
          <div className="space-y-4">
            {briefings.map((briefing) => (
              <div key={briefing.id} className="rounded-2xl border border-line bg-elevated/40 p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-magenta">
                  Preenchido em {formatDate(briefing.submittedAt)}
                </p>
                <dl className="space-y-1.5">
                  {Object.entries(briefing.payload as Record<string, unknown>)
                    .filter(([key]) => !TECHNICAL_KEYS.has(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
                        <dt className="shrink-0 font-medium text-muted sm:w-56">{humanizeKey(key)}</dt>
                        <dd className="whitespace-pre-wrap text-ink/90">{formatValue(value)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
