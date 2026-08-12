import { notFound } from "next/navigation";
import { REPORT_CLIENTS } from "@/lib/reports/clients";
import { ClientReportDashboard } from "./client-report-dashboard";

export default async function DashboardClientPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const config = REPORT_CLIENTS[client];

  if (!config) notFound();

  return <ClientReportDashboard client={client} displayName={config.displayName} />;
}
