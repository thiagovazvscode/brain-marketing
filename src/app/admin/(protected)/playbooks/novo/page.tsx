import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, methods, adminUsers } from "@/db/schema";
import { PlaybookForm } from "@/components/admin/PlaybookForm";

export const dynamic = "force-dynamic";

export default async function NewPlaybookPage({ searchParams }: { searchParams: Promise<{ methodId?: string }> }) {
  const { methodId } = await searchParams;

  const [productRows, methodRows, authorRows] = await Promise.all([
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
    db.select({ id: methods.id, name: methods.name }).from(methods).orderBy(asc(methods.name)),
    db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).orderBy(asc(adminUsers.name)),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Novo playbook</h1>
        <p className="text-sm text-os-muted">
          Nasce como rascunho. O construtor completo de etapas e tarefas chega na Etapa 2 — aqui você define o modelo.
        </p>
      </div>
      <PlaybookForm
        mode="create"
        initialValues={methodId ? { methodId } : undefined}
        methodOptions={methodRows}
        productOptions={productRows}
        authorOptions={authorRows.map((a) => ({ id: a.id, name: a.name ?? a.email }))}
      />
    </div>
  );
}
