import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, methods, adminUsers } from "@/db/schema";
import { getPlaybookDetail } from "@/lib/methods-data";
import { PlaybookForm } from "@/components/admin/PlaybookForm";

export const dynamic = "force-dynamic";

export default async function EditPlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, productRows, methodRows, authorRows] = await Promise.all([
    getPlaybookDetail(id),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
    db.select({ id: methods.id, name: methods.name }).from(methods).orderBy(asc(methods.name)),
    db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).orderBy(asc(adminUsers.name)),
  ]);
  if (!detail) notFound();

  const { playbook } = detail;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Editar {playbook.name}</h1>
        {playbook.status === "publicado" && (
          <p className="mt-1 text-sm text-amber-700">
            Este playbook está publicado — salvar cria a versão {"“"}rascunho{"”"} seguinte, sem alterar a versão publicada.
          </p>
        )}
      </div>
      <PlaybookForm
        mode="edit"
        playbookId={playbook.id}
        initialValues={{
          name: playbook.name,
          description: playbook.description ?? "",
          objective: playbook.objective ?? "",
          methodId: playbook.methodId,
          productId: playbook.productId,
          type: playbook.type,
          defaultDurationDays: playbook.defaultDurationDays != null ? String(playbook.defaultDurationDays) : "",
          prerequisites: playbook.prerequisites,
          expectedResult: playbook.expectedResult ?? "",
          defaultResponsibles: playbook.defaultResponsibles,
          requiredDocuments: playbook.requiredDocuments,
          deliverables: playbook.deliverables,
          successCriteria: playbook.successCriteria,
          authorId: playbook.authorId ?? "",
        }}
        methodOptions={methodRows}
        productOptions={productRows}
        authorOptions={authorRows.map((a) => ({ id: a.id, name: a.name ?? a.email }))}
      />
    </div>
  );
}
