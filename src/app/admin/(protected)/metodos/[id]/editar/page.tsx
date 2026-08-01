import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, adminUsers } from "@/db/schema";
import { getMethodDetail } from "@/lib/methods-data";
import { MethodForm } from "@/components/admin/MethodForm";

export const dynamic = "force-dynamic";

export default async function EditMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, productRows, authorRows] = await Promise.all([
    getMethodDetail(id),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
    db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).orderBy(asc(adminUsers.name)),
  ]);
  if (!detail) notFound();

  const { method, products: relatedProducts } = detail;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Editar {method.name}</h1>
        {method.status === "publicado" && (
          <p className="mt-1 text-sm text-amber-700">
            Este método está publicado — salvar cria a versão {"“"}rascunho{"”"} seguinte, sem alterar a versão publicada.
          </p>
        )}
      </div>
      <MethodForm
        mode="edit"
        methodId={method.id}
        initialValues={{
          name: method.name,
          shortDescription: method.shortDescription ?? "",
          fullDescription: method.fullDescription ?? "",
          category: method.category ?? "",
          problemSolved: method.problemSolved ?? "",
          idealClientProfile: method.idealClientProfile ?? "",
          expectedResult: method.expectedResult ?? "",
          principles: method.principles,
          premises: method.premises,
          successIndicators: method.successIndicators,
          risks: method.risks,
          authorId: method.authorId ?? "",
          productIds: relatedProducts.map((p) => p.productId),
        }}
        productOptions={productRows}
        authorOptions={authorRows.map((a) => ({ id: a.id, name: a.name ?? a.email }))}
      />
    </div>
  );
}
