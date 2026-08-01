import { eq, asc, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, productPlans, clientProducts } from "@/db/schema";
import { ProductPlansPanel } from "@/components/admin/ProductPlansPanel";
import { ProductStatusToggle } from "@/components/admin/ProductStatusToggle";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) notFound();

  const [plans, [clientStats]] = await Promise.all([
    db.select().from(productPlans).where(eq(productPlans.productId, product.id)).orderBy(asc(productPlans.sortOrder)),
    db
      .select({
        clientCount: sql<number>`count(*)::int`,
        mrr: sql<string>`COALESCE(SUM(${clientProducts.impactOnMrr}), 0)`,
      })
      .from(clientProducts)
      .where(and(eq(clientProducts.productId, product.id), eq(clientProducts.status, "ativo"))),
  ]);

  const mrr = Number(clientStats?.mrr ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-os-ink">{product.name}</h1>
          <p className="text-sm text-os-muted">{product.category ?? "Sem categoria"} · {product.shortDescription ?? "Sem descrição"}</p>
        </div>
        <ProductStatusToggle productSlug={product.slug} isActive={product.isActive} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <p className="text-2xl font-black text-os-ink">{clientStats?.clientCount ?? 0}</p>
          <p className="mt-1 text-xs font-medium text-os-muted">Clientes ativos</p>
        </div>
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <p className="text-2xl font-black text-os-ink">{mrr}</p>
          <p className="mt-1 text-xs font-medium text-os-muted">MRR deste produto</p>
        </div>
        <div className="rounded-2xl border border-os-border bg-os-card p-5">
          <p className="text-2xl font-black text-os-ink">{plans.length}</p>
          <p className="mt-1 text-xs font-medium text-os-muted">Planos cadastrados</p>
        </div>
      </div>

      <section className="rounded-2xl border border-os-border bg-os-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-os-ink">Planos</h2>
        <ProductPlansPanel productSlug={product.slug} plans={plans} />
      </section>
    </div>
  );
}
