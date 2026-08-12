import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { ClientReportDashboard } from "./client-report-dashboard";

// Nenhum mapa estático de clientes — qualquer linha em `clients` com uma
// integração Meta conectada funciona aqui automaticamente.
export default async function DashboardClientPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const [row] = await db.select({ name: clients.name }).from(clients).where(eq(clients.slug, client)).limit(1);

  if (!row) notFound();

  return <ClientReportDashboard client={client} displayName={row.name} />;
}
