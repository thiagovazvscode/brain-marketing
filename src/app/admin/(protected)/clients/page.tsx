import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefings } from "@/db/schema";
import { ClientsListClient, type ClientRow } from "@/components/admin/ClientsListClient";

// Contagem de briefings/MRR/saúde muda a cada request — sem isso o Next
// pré-renderiza a lista no build e ela fica presa no snapshot do deploy.
export const dynamic = "force-dynamic";

type HealthRow = {
  client_id: string;
  mrr: string;
  has_stuck: boolean;
  has_overdue: boolean;
  next_action_date: string | null;
};

async function getClients(): Promise<ClientRow[]> {
  const [baseRows, healthResult] = await Promise.all([
    db
      .select({
        id: clients.id,
        slug: clients.slug,
        name: clients.name,
        whatsapp: clients.whatsapp,
        enteredAt: clients.enteredAt,
        createdAt: clients.createdAt,
        briefingsCount: sql<number>`count(${clientBriefings.id})`,
        lastSubmittedAt: sql<string | null>`max(${clientBriefings.submittedAt})`,
      })
      .from(clients)
      .leftJoin(clientBriefings, eq(clientBriefings.clientId, clients.id))
      .groupBy(clients.id)
      .orderBy(desc(clients.createdAt)),
    // "Saúde" é heurística derivada do que já existe (histórico de estágio +
    // próxima ação da contratação) — não é um score fabricado nem uma coluna
    // nova no schema.
    db.execute<HealthRow>(sql`
      SELECT
        cp.client_id,
        COALESCE(SUM(cp.impact_on_mrr), 0) as mrr,
        bool_or(csh_last.last_change < now() - interval '21 days') as has_stuck,
        bool_or(cp.next_action_date IS NOT NULL AND cp.next_action_date < current_date) as has_overdue,
        min(cp.next_action_date) FILTER (WHERE cp.next_action_date >= current_date) as next_action_date
      FROM client_products cp
      LEFT JOIN LATERAL (
        SELECT MAX(changed_at) as last_change FROM client_stage_history WHERE client_product_id = cp.id
      ) csh_last ON true
      WHERE cp.status = 'ativo'
      GROUP BY cp.client_id
    `),
  ]);

  const healthByClient = new Map(healthResult.rows.map((r) => [r.client_id, r]));

  return baseRows.map((row) => {
    const health = healthByClient.get(row.id);
    let saude: "boa" | "atencao" | "critica" = "boa";
    if (health?.has_stuck) saude = "critica";
    else if (health?.has_overdue) saude = "atencao";

    return {
      ...row,
      mrr: health?.mrr ?? "0",
      saude,
      nextActionDate: health?.next_action_date ?? null,
    };
  });
}

export default async function AdminClientsPage() {
  const clientRows = await getClients();
  return <ClientsListClient clients={clientRows} />;
}
