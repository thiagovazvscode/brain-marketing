import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { trackedLinks, linkClicks, clients } from "@/db/schema";
import { CreateLinkForm } from "@/components/admin/CreateLinkForm";

// Evita pré-renderização estática no build — a lista de links e cliques
// precisa refletir o banco a cada request, não um snapshot do deploy.
export const dynamic = "force-dynamic";

async function mostCommonNextPage(linkId: string): Promise<{ path: string; count: number } | null> {
  const result = await db.execute<{ path: string; count: number }>(sql`
    SELECT pv.path as path, count(*)::int as count
    FROM link_clicks lc
    JOIN page_views pv ON pv.session_id = lc.session_id AND pv.created_at >= lc.created_at
    WHERE lc.link_id = ${linkId}
    GROUP BY pv.path
    ORDER BY count(*) DESC
    LIMIT 1
  `);
  return result.rows[0] ?? null;
}

export default async function AdminLinksPage() {
  // Server Component: executa uma vez por request, sem re-render/memo — a
  // regra de pureza do React Compiler não se aplica aqui como se aplicaria
  // num client component.
  // eslint-disable-next-line react-hooks/purity
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [linkRows, clientRows] = await Promise.all([
    db
      .select({
        id: trackedLinks.id,
        slug: trackedLinks.slug,
        label: trackedLinks.label,
        destinationUrl: trackedLinks.destinationUrl,
        campaign: trackedLinks.campaign,
        isActive: trackedLinks.isActive,
        ownerClientName: clients.name,
        totalClicks: sql<number>`count(${linkClicks.id})`,
        clicksLast30d: sql<number>`count(${linkClicks.id}) filter (where ${linkClicks.createdAt} >= ${since30d})`,
      })
      .from(trackedLinks)
      .leftJoin(linkClicks, eq(linkClicks.linkId, trackedLinks.id))
      .leftJoin(clients, eq(clients.id, trackedLinks.ownerClientId))
      .groupBy(trackedLinks.id, clients.name)
      .orderBy(desc(sql`count(${linkClicks.id})`)),
    db.select({ id: clients.id, name: clients.name }).from(clients),
  ]);

  const journeys = await Promise.all(linkRows.map((l) => mostCommonNextPage(l.id)));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Links e Páginas</h1>
        <p className="text-sm text-os-muted">Links próprios rastreáveis — bio, WhatsApp, anúncios — com destino e desempenho.</p>
      </div>

      <CreateLinkForm clients={clientRows} />

      {linkRows.length === 0 ? (
        <p className="rounded-xl border border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
          Nenhum link criado ainda.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-os-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-os-border bg-os-card/60 text-left text-xs uppercase tracking-wide text-os-muted">
                <th className="px-4 py-3 font-semibold">Link</th>
                <th className="px-4 py-3 font-semibold">Destino</th>
                <th className="px-4 py-3 font-semibold">Campanha</th>
                <th className="px-4 py-3 font-semibold">Cliques (total / 30d)</th>
                <th className="px-4 py-3 font-semibold">Depois do clique, vai mais pra</th>
              </tr>
            </thead>
            <tbody>
              {linkRows.map((link, i) => (
                <tr key={link.id} className="border-b border-os-border/60 bg-os-card/20 hover:bg-os-bg/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-os-ink">{link.label}</p>
                    <p className="text-xs text-os-muted">
                      /l/{link.slug} {link.ownerClientName && `· ${link.ownerClientName}`}
                      {!link.isActive && <span className="ml-1 text-red-400">(inativo)</span>}
                    </p>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-os-muted">{link.destinationUrl}</td>
                  <td className="px-4 py-3 text-xs text-os-ink/80">{link.campaign ?? "—"}</td>
                  <td className="px-4 py-3 text-xs tabular-nums text-os-ink">
                    <span className="font-bold">{link.totalClicks}</span> / {link.clicksLast30d}
                  </td>
                  <td className="px-4 py-3 text-xs text-os-muted">
                    {journeys[i] ? `${journeys[i]!.path} (${journeys[i]!.count})` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
