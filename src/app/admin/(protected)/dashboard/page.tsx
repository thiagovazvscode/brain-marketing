import { sql, eq, desc } from "drizzle-orm";
import { Eye, MousePointerClick, Users, Percent, Building2, Layers, AlertTriangle, Link2, Wallet, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { clientProducts, products, trackedLinks, linkClicks, pageViews, quizSessions } from "@/db/schema";
import { METHOD_STAGES } from "@/lib/method-stages";
import { DashboardTabs } from "@/components/admin/DashboardTabs";
import { StatTile, HorizontalBarList } from "@/components/admin/DashboardWidgets";
import { TrendLineChart } from "@/components/admin/charts/TrendLineChart";
import { StageFunnelChart } from "@/components/admin/charts/StageFunnelChart";

// Sem isso, o Next tentaria pré-renderizar esta página estaticamente no
// build (já que não usa cookies()/headers()) e o dashboard ficaria
// congelado no snapshot do momento do deploy, nunca refletindo dado novo.
export const dynamic = "force-dynamic";

async function getOperacaoData() {
  const [clientesAtivosResult, entregasAtivasResult, receitaResult, stageRows, produtoRows, travadasResult, oportunidadeRows, novosPorMesResult] =
    await Promise.all([
      db.execute<{ count: number }>(sql`SELECT count(DISTINCT client_id)::int as count FROM client_products WHERE status = 'ativo'`),
      db.execute<{ count: number }>(sql`SELECT count(*)::int as count FROM client_products WHERE status = 'ativo'`),
      db.execute<{ mrr: string; contratada: string }>(sql`
        SELECT
          COALESCE(SUM(impact_on_mrr) FILTER (WHERE status = 'ativo'), 0) as mrr,
          COALESCE(SUM(negotiated_value) FILTER (WHERE status <> 'encerrado'), 0) as contratada
        FROM client_products
      `),
      db
        .select({ stage: clientProducts.currentStage, count: sql<number>`count(*)::int` })
        .from(clientProducts)
        .where(sql`${clientProducts.status} != 'encerrado'`)
        .groupBy(clientProducts.currentStage),
      db
        .select({ name: products.name, count: sql<number>`count(DISTINCT ${clientProducts.clientId})::int` })
        .from(clientProducts)
        .innerJoin(products, eq(products.id, clientProducts.productId))
        .where(eq(clientProducts.status, "ativo"))
        .groupBy(products.name)
        .orderBy(desc(sql`count(DISTINCT ${clientProducts.clientId})`)),
      db.execute<{ count: number }>(sql`
        SELECT count(*)::int as count FROM (
          SELECT cp.id, MAX(csh.changed_at) as last_change
          FROM client_products cp
          JOIN client_stage_history csh ON csh.client_product_id = cp.id
          WHERE cp.status = 'ativo'
          GROUP BY cp.id
        ) t WHERE last_change < now() - interval '21 days'
      `),
      db.execute<{ client_id: string; client_name: string; recommendations: { productSlug: string; reason: string }[] }>(sql`
        SELECT DISTINCT ON (cd.client_id) cd.client_id, c.name as client_name, cd.recommendations
        FROM client_diagnostics cd
        JOIN clients c ON c.id = cd.client_id
        ORDER BY cd.client_id, cd.created_at DESC
      `),
      db.execute<{ month: string; count: number }>(sql`
        SELECT to_char(date_trunc('month', COALESCE(entered_at::timestamp, created_at)), 'YYYY-MM') as month, count(*)::int as count
        FROM clients
        WHERE COALESCE(entered_at::timestamp, created_at) >= now() - interval '12 months'
        GROUP BY 1 ORDER BY 1
      `),
    ]);

  const funil = METHOD_STAGES.map((s) => ({
    label: s.label,
    value: stageRows.find((r) => r.stage === s.id)?.count ?? 0,
  }));

  const oportunidades = oportunidadeRows.rows.flatMap((row) =>
    (row.recommendations ?? []).map((rec) => ({
      cliente: row.client_name,
      produto: rec.productSlug,
      motivo: rec.reason,
    }))
  );

  const novosPorMes = novosPorMesResult.rows.map((r) => ({
    label: new Date(`${r.month}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    clientes: r.count,
  }));

  return {
    clientesAtivos: clientesAtivosResult.rows[0]?.count ?? 0,
    entregasAtivas: entregasAtivasResult.rows[0]?.count ?? 0,
    entregasTravadas: travadasResult.rows[0]?.count ?? 0,
    mrr: Number(receitaResult.rows[0]?.mrr ?? 0),
    receitaContratada: Number(receitaResult.rows[0]?.contratada ?? 0),
    funil,
    produtoRows,
    oportunidades,
    novosPorMes,
  };
}

async function getLinksData() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since30 = sql`${since30d}`;

  const [linkRows, pageRows, campaignRows, dailyPageViews, dailyClicks] = await Promise.all([
    db
      .select({
        label: trackedLinks.label,
        totalClicks: sql<number>`count(${linkClicks.id})::int`,
      })
      .from(trackedLinks)
      .leftJoin(linkClicks, eq(linkClicks.linkId, trackedLinks.id))
      .groupBy(trackedLinks.id, trackedLinks.label)
      .orderBy(desc(sql`count(${linkClicks.id})`))
      .limit(8),
    db
      .select({ path: pageViews.path, count: sql<number>`count(*)::int` })
      .from(pageViews)
      .groupBy(pageViews.path)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db.execute<{ campaign: string; count: number }>(sql`
      SELECT COALESCE(utm_campaign, '(sem campanha)') as campaign, count(*)::int as count
      FROM page_views GROUP BY 1 ORDER BY count DESC LIMIT 8
    `),
    db.execute<{ day: string; count: number }>(sql`
      SELECT to_char(date_trunc('day', created_at), 'DD/MM') as day, count(*)::int as count
      FROM page_views WHERE created_at >= ${since30} GROUP BY date_trunc('day', created_at) ORDER BY date_trunc('day', created_at)
    `),
    db.execute<{ day: string; count: number }>(sql`
      SELECT to_char(date_trunc('day', created_at), 'DD/MM') as day, count(*)::int as count
      FROM click_events WHERE created_at >= ${since30} GROUP BY date_trunc('day', created_at) ORDER BY date_trunc('day', created_at)
    `),
  ]);

  const dayMap = new Map<string, { pageViews: number; clicks: number }>();
  for (const r of dailyPageViews.rows) dayMap.set(r.day, { pageViews: r.count, clicks: 0 });
  for (const r of dailyClicks.rows) {
    const existing = dayMap.get(r.day) ?? { pageViews: 0, clicks: 0 };
    existing.clicks = r.count;
    dayMap.set(r.day, existing);
  }
  const daily = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, v]) => ({ label, pageViews: v.pageViews, clicks: v.clicks }));

  return {
    linkRanking: linkRows.map((r) => ({ label: r.label, count: r.totalClicks })),
    topPages: pageRows.map((r) => ({ label: r.path, count: r.count })),
    campaignBreakdown: campaignRows.rows.map((r) => ({ label: r.campaign, count: r.count })),
    daily,
  };
}

async function getLeadsData() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since30 = sql`${since30d}`;

  const [leadsCountResult, closedCountResult, campaignRows, dailyPageViews, dailyLeads, funnelCounts] = await Promise.all([
    db.execute<{ count: number }>(sql`SELECT count(*)::int as count FROM leads WHERE created_at >= ${since30}`),
    db.execute<{ count: number }>(sql`SELECT count(*)::int as count FROM leads WHERE created_at >= ${since30} AND status = 'fechado'`),
    db.execute<{ campaign: string; count: number }>(sql`
      SELECT COALESCE(utm_campaign, '(sem campanha)') as campaign, count(*)::int as count
      FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 8
    `),
    db.execute<{ day: string; count: number }>(sql`
      SELECT to_char(date_trunc('day', created_at), 'DD/MM') as day, count(*)::int as count
      FROM page_views WHERE created_at >= ${since30} GROUP BY date_trunc('day', created_at) ORDER BY date_trunc('day', created_at)
    `),
    db.execute<{ day: string; count: number }>(sql`
      SELECT to_char(date_trunc('day', created_at), 'DD/MM') as day, count(*)::int as count
      FROM leads WHERE created_at >= ${since30} GROUP BY date_trunc('day', created_at) ORDER BY date_trunc('day', created_at)
    `),
    Promise.all(
      [1, 2, 3, 4, 5].map((step) =>
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(quizSessions)
          .where(sql`${quizSessions.lastStep} >= ${step}`)
      )
    ),
  ]);

  const leadsCount = leadsCountResult.rows[0]?.count ?? 0;
  const closedCount = closedCountResult.rows[0]?.count ?? 0;

  const dayMap = new Map<string, { pageViews: number; leads: number }>();
  for (const r of dailyPageViews.rows) dayMap.set(r.day, { pageViews: r.count, leads: 0 });
  for (const r of dailyLeads.rows) {
    const existing = dayMap.get(r.day) ?? { pageViews: 0, leads: 0 };
    existing.leads = r.count;
    dayMap.set(r.day, existing);
  }
  const daily = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, v]) => ({ label, pageViews: v.pageViews, leads: v.leads }));

  const quizFunnel = funnelCounts.map((rows, i) => ({
    label: `Passo ${i + 1}`,
    count: rows[0]?.count ?? 0,
  }));

  return {
    leadsCount,
    quizFunnel,
    campaignBreakdown: campaignRows.rows.map((r) => ({ label: r.campaign, count: r.count })),
    daily,
    // Aproximação: não há vínculo direto entre `leads` e `clients` no schema
    // hoje — usamos status "fechado" como proxy de conversão. Ver relatório final.
    leadToClientRate: leadsCount > 0 ? closedCount / leadsCount : 0,
  };
}

export default async function AdminDashboardPage() {
  const [operacao, linksData, leadsData] = await Promise.all([getOperacaoData(), getLinksData(), getLeadsData()]);

  const formatCurrency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const operacaoSection = (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Wallet} label="Receita recorrente (MRR)" value={formatCurrency(operacao.mrr)} />
        <StatTile icon={TrendingUp} label="Receita contratada (total)" value={formatCurrency(operacao.receitaContratada)} />
        <StatTile icon={Building2} label="Clientes ativos" value={String(operacao.clientesAtivos)} />
        <StatTile icon={Layers} label="Entregas ativas" value={String(operacao.entregasAtivas)} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={AlertTriangle} label="Entregas travadas (>21d)" value={String(operacao.entregasTravadas)} />
        <StatTile icon={Users} label="Oportunidades de upsell" value={String(operacao.oportunidades.length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-os-border bg-os-card/50 p-5">
          <h3 className="mb-2 text-sm font-bold text-os-ink">Funil do Método Brain</h3>
          <StageFunnelChart data={operacao.funil} />
        </div>
        <HorizontalBarList title="Clientes por produto" items={operacao.produtoRows.map((p) => ({ label: p.name, count: p.count }))} />
      </div>

      <div className="mt-4 rounded-2xl border border-os-border bg-os-card/50 p-5">
        <h3 className="mb-2 text-sm font-bold text-os-ink">Clientes novos por mês</h3>
        <TrendLineChart data={operacao.novosPorMes} series={[{ key: "clientes", name: "Clientes novos", color: "#16a34a" }]} />
      </div>

      <div className="mt-4 rounded-2xl border border-os-border bg-os-card/50 p-5">
        <h3 className="mb-3 text-sm font-bold text-os-ink">Oportunidades (cliente × produto × motivo)</h3>
        {operacao.oportunidades.length === 0 ? (
          <p className="text-xs text-os-muted">Nenhum diagnóstico com recomendação ainda.</p>
        ) : (
          <div className="space-y-2">
            {operacao.oportunidades.map((op, i) => (
              <div key={i} className="rounded-xl border border-os-border bg-os-bg/40 p-3 text-xs">
                <p className="font-bold text-os-ink">
                  {op.cliente} <span className="text-os-accent">→ {op.produto}</span>
                </p>
                <p className="mt-0.5 text-os-muted">{op.motivo}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const linksSection = (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HorizontalBarList title="Ranking de links por cliques" items={linksData.linkRanking} />
        <HorizontalBarList title="Páginas mais vistas" items={linksData.topPages} />
      </div>
      <div className="mb-4">
        <HorizontalBarList title="Breakdown por campanha (UTM)" items={linksData.campaignBreakdown} />
      </div>
      <div className="rounded-2xl border border-os-border bg-os-card/50 p-5">
        <h3 className="mb-2 text-sm font-bold text-os-ink">Evolução diária — page views × cliques (30 dias)</h3>
        <TrendLineChart
          data={linksData.daily}
          series={[
            { key: "pageViews", name: "Page views", color: "#16a34a" },
            { key: "clicks", name: "Cliques", color: "#86efac" },
          ]}
        />
      </div>
    </div>
  );

  const leadsSection = (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Eye} label="Page views (30d)" value={String(leadsData.daily.reduce((s, d) => s + d.pageViews, 0))} />
        <StatTile icon={MousePointerClick} label="Leads (30d)" value={String(leadsData.leadsCount)} />
        <StatTile
          icon={Percent}
          label="Conclusão do quiz"
          value={`${leadsData.quizFunnel[0]?.count ? Math.round(((leadsData.quizFunnel[4]?.count ?? 0) / leadsData.quizFunnel[0].count) * 100) : 0}%`}
        />
        <StatTile icon={Link2} label="Lead → fechado (aprox.)" value={`${Math.round(leadsData.leadToClientRate * 100)}%`} />
      </div>

      <div className="mb-4 rounded-2xl border border-os-border bg-os-card/50 p-5">
        <h3 className="mb-2 text-sm font-bold text-os-ink">Evolução diária — page views × leads (30 dias)</h3>
        <TrendLineChart
          data={leadsData.daily}
          series={[
            { key: "pageViews", name: "Page views", color: "#16a34a" },
            { key: "leads", name: "Leads", color: "#86efac" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-os-border bg-os-card/50 p-5">
          <h3 className="mb-2 text-sm font-bold text-os-ink">Funil do quiz</h3>
          <StageFunnelChart data={leadsData.quizFunnel.map((s) => ({ label: s.label, value: s.count }))} />
        </div>
        <HorizontalBarList title="Leads por campanha" items={leadsData.campaignBreakdown} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-os-ink">Dashboard</h1>
        <p className="text-sm text-os-muted">Operação da agência, links e páginas, leads e conversão.</p>
      </div>
      <DashboardTabs operacao={operacaoSection} links={linksSection} leads={leadsSection} />
    </div>
  );
}
