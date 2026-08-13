import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, fmtCurrency, fmtInteger, fmtPercent, fmtDecimal, fmtDate, fmtShortDate, fmtGeneratedAt } from "./theme";
import { PdfLineChart } from "./LineChart";
import type { ReportContract } from "@/lib/reports/query";

const LOGO_PATH = path.join(process.cwd(), "public/images/logo.png");

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: PDF_COLORS.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { width: 90, height: 27 },
  headerMeta: { alignItems: "flex-end" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: PDF_COLORS.muted, marginBottom: 10 },
  contextBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    backgroundColor: PDF_COLORS.surface,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  contextItem: { flexDirection: "column" },
  contextLabel: { fontSize: 7, color: PDF_COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  contextValue: { fontSize: 9, fontWeight: 700, marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  kpiCard: { width: "23%", border: `1px solid ${PDF_COLORS.line}`, borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 7, color: PDF_COLORS.muted },
  kpiValue: { fontSize: 13, fontWeight: 700, marginTop: 3 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 4, marginBottom: 8, color: PDF_COLORS.brandDark },
  table: { border: `1px solid ${PDF_COLORS.line}`, borderRadius: 4, marginBottom: 14 },
  tr: { flexDirection: "row", borderBottom: `1px solid ${PDF_COLORS.line}` },
  trLast: { flexDirection: "row" },
  thCell: { flex: 1, padding: 6, backgroundColor: PDF_COLORS.surface, fontSize: 7.5, fontWeight: 700, color: PDF_COLORS.muted, textTransform: "uppercase" },
  tdCell: { flex: 1, padding: 6, fontSize: 8.5 },
  diagnosticItem: { padding: 6, backgroundColor: PDF_COLORS.surface, borderRadius: 4, marginBottom: 5, fontSize: 8.5 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, borderTop: `1px solid ${PDF_COLORS.line}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: PDF_COLORS.muted },
  legendRow: { flexDirection: "row", marginBottom: 6 },
});

function Footer({ page }: { page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>BRAIN Marketing & Performance — suporte@brainmktp.com.br — brainmktp.com.br</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${page} · ${pageNumber}/${totalPages}`} />
    </View>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

export function ReportDocument({
  report,
  generatedAt,
  scopeLabel,
}: {
  report: ReportContract & { client: { slug: string; name: string }; account: unknown };
  generatedAt: Date;
  /** Rótulo do recorte ativo (ex.: "Village Natureza", "Todas as campanhas") */
  scopeLabel: string;
}) {
  if (!("summary" in report)) return null; // nunca deveria chegar aqui — a rota valida antes
  const r = report as Extract<ReportContract, { summary: unknown }>;

  const trendSeries = Object.keys(r.trend[0] ?? {}).filter((k) => k !== "date");
  const leadsTrendPoints = r.trend.map((row) => ({
    x: fmtShortDate(String(row.date)),
    y: trendSeries.reduce((sum, k) => sum + (Number(row[k]) || 0), 0) / Math.max(trendSeries.length, 1),
  }));

  return (
    <Document title={`Relatório Brain — ${r.client.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is a PDF primitive, not an HTML/DOM element; it has no alt prop */}
          <Image src={LOGO_PATH} style={styles.logo} />
          <View style={styles.headerMeta}>
            <Text style={{ fontSize: 8, color: PDF_COLORS.muted }}>Gerado em {fmtGeneratedAt(generatedAt)}</Text>
          </View>
        </View>

        <Text style={styles.title}>Relatório de Performance — {r.client.name}</Text>
        <Text style={styles.subtitle}>
          {scopeLabel} · {fmtDate(r.period.since)} até {fmtDate(r.period.until)}
        </Text>

        <View style={styles.contextBar}>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Cliente</Text>
            <Text style={styles.contextValue}>{r.client.name}</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Conta de anúncios</Text>
            <Text style={styles.contextValue}>{r.account.name}</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Período</Text>
            <Text style={styles.contextValue}>
              {fmtDate(r.period.since)} — {fmtDate(r.period.until)}
            </Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Recorte</Text>
            <Text style={styles.contextValue}>{scopeLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Indicadores do período</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Investimento" value={fmtCurrency(r.summary.spend)} />
          <KpiCard label="Leads" value={fmtInteger(r.summary.leads)} />
          <KpiCard label="CPL" value={fmtCurrency(r.summary.cpl)} />
          <KpiCard label="CTR Link" value={fmtPercent(r.summary.ctrLink)} />
          <KpiCard label="CPM" value={fmtCurrency(r.summary.cpm)} />
          <KpiCard label="Alcance" value={fmtInteger(r.summary.reach)} />
          <KpiCard label="Frequência" value={fmtDecimal(r.summary.frequency)} />
          <KpiCard label="Cliques no link" value={fmtInteger(r.summary.linkClicks)} />
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>Evolução do período</Text>
          <PdfLineChart series={[{ label: "Média diária", color: PDF_COLORS.seriesA, points: leadsTrendPoints }]} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Campanhas incluídas ({r.campaigns.length})</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.thCell}>Campanha</Text>
            <Text style={styles.thCell}>Leads</Text>
            <Text style={styles.thCell}>Investimento</Text>
            <Text style={styles.thCell}>CPL</Text>
            <Text style={styles.thCell}>CTR Link</Text>
          </View>
          {r.campaigns.slice(0, 12).map((c, i) => (
            <View key={c.id} style={i === r.campaigns.slice(0, 12).length - 1 ? styles.trLast : styles.tr}>
              <Text style={styles.tdCell}>{c.name}</Text>
              <Text style={styles.tdCell}>{fmtInteger(c.leads)}</Text>
              <Text style={styles.tdCell}>{fmtCurrency(c.spend)}</Text>
              <Text style={styles.tdCell}>{fmtCurrency(c.cpl)}</Text>
              <Text style={styles.tdCell}>{fmtPercent(c.ctrLink)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Anúncios de melhor performance</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.thCell}>Anúncio</Text>
            <Text style={styles.thCell}>Campanha</Text>
            <Text style={styles.thCell}>Leads</Text>
            <Text style={styles.thCell}>CPL</Text>
            <Text style={styles.thCell}>CTR</Text>
          </View>
          {[...r.ads]
            .sort((x, y) => y.leads - x.leads)
            .slice(0, 8)
            .map((ad, i, arr) => (
              <View key={ad.id} style={i === arr.length - 1 ? styles.trLast : styles.tr}>
                <Text style={styles.tdCell}>{ad.name}</Text>
                <Text style={styles.tdCell}>{ad.campaignName ?? "—"}</Text>
                <Text style={styles.tdCell}>{fmtInteger(ad.leads)}</Text>
                <Text style={styles.tdCell}>{fmtCurrency(ad.cpl)}</Text>
                <Text style={styles.tdCell}>{fmtPercent(ad.ctrLink)}</Text>
              </View>
            ))}
        </View>

        {r.diagnostics.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            {r.diagnostics.map((d, i) => (
              <Text key={i} style={styles.diagnosticItem}>
                {d.message}
              </Text>
            ))}
          </>
        ) : null}

        <Footer page={r.client.name} />
      </Page>
    </Document>
  );
}
