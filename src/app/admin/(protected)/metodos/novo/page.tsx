import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, adminUsers } from "@/db/schema";
import { MethodForm } from "@/components/admin/MethodForm";

export const dynamic = "force-dynamic";

export default async function NewMethodPage() {
  const [productRows, authorRows] = await Promise.all([
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
    db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).orderBy(asc(adminUsers.name)),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Novo método</h1>
        <p className="text-sm text-os-muted">Nasce como rascunho — publique quando estiver pronto para uso.</p>
      </div>
      <MethodForm
        mode="create"
        productOptions={productRows}
        authorOptions={authorRows.map((a) => ({ id: a.id, name: a.name ?? a.email }))}
      />
    </div>
  );
}
