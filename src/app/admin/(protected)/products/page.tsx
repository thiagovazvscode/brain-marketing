import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { CreateProductForm } from "@/components/admin/CreateProductForm";

// Contagem de planos/clientes/MRR muda a cada request — sem isso o Next
// pré-renderiza a lista no build e ela fica congelada no snapshot do deploy.
export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  is_active: boolean;
  is_entry_product: boolean;
  plan_count: number;
  client_count: number;
  mrr: string;
};

async function getProducts() {
  const result = await db.execute<ProductRow>(sql`
    SELECT
      p.id, p.slug, p.name, p.category, p.is_active, p.is_entry_product,
      count(DISTINCT pp.id)::int as plan_count,
      count(DISTINCT cp.id) FILTER (WHERE cp.status = 'ativo')::int as client_count,
      COALESCE(SUM(cp.impact_on_mrr) FILTER (WHERE cp.status = 'ativo'), 0) as mrr
    FROM products p
    LEFT JOIN product_plans pp ON pp.product_id = p.id
    LEFT JOIN client_products cp ON cp.product_id = p.id
    GROUP BY p.id
    ORDER BY p.sort_order
  `);
  return result.rows;
}

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default async function AdminProductsPage() {
  const rows = await getProducts();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Produtos e Planos</h1>
        <p className="text-sm text-os-muted">Catálogo de produtos da Brain — a fonte de verdade do que pode ser vendido.</p>
      </div>

      <CreateProductForm />

      <div className="overflow-hidden rounded-2xl border border-os-border bg-os-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-os-border bg-os-bg text-left text-xs uppercase tracking-wide text-os-muted">
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Planos</th>
              <th className="px-4 py-3 font-semibold">Clientes ativos</th>
              <th className="px-4 py-3 font-semibold">MRR</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-os-border/60 last:border-0 hover:bg-os-bg/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${row.slug}`} className="font-semibold text-os-ink hover:text-os-accent">
                    {row.name}
                  </Link>
                  {row.is_entry_product && (
                    <span className="ml-2 rounded-full bg-os-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-os-accent">
                      Entrada
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-os-muted">{row.category ?? "—"}</td>
                <td className="px-4 py-3 text-os-ink">{row.plan_count}</td>
                <td className="px-4 py-3 text-os-ink">{row.client_count}</td>
                <td className="px-4 py-3 font-semibold text-os-ink">{formatCurrency(row.mrr)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      row.is_active ? "bg-os-accent-soft text-os-accent" : "bg-os-border text-os-muted"
                    }`}
                  >
                    {row.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
