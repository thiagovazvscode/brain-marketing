import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, fmtCurrency, fmtInteger, fmtPercent, fmtDecimal, fmtDate, fmtShortDate, fmtGeneratedAt } from "./theme";
import { PdfLineChart } from "./LineChart";
import type { ComparisonResult } from "@/lib/reports/comparison";

const LOGO_PATH = path.join(process.cwd(), "public/images/logo.png");

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: PDF_COLORS.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { width: 90, height: 27 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: PDF_COLORS.muted, marginBottom: 14 },
  vsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14, gap: 10 },
  vsCard: { flex: 1, borderRadius: 4, padding: 10 },
  vsCardA: { backgroundColor: "#eff6ff", border: `1px solid ${PDF_COLORS.seriesA}` },
  vsCardB: { backgroundColor: "#fff2ec", border: `1px solid ${PDF_COLORS.seriesB}` },
  vsLabel: { fontSize: 7, color: PDF_COLORS.muted, textTransform: "uppercase" },
  vsName: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  vsSub: { fontSize: 7.5, color: PDF_COLORS.muted, marginTop: 4 },
  vsText: { fontSize: 12, fontWeight: 700, color: PDF_COLORS.muted },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 4, marginBottom: 8, color: PDF_COLORS.brandDark },
  table: { border: `1px solid ${PDF_COLORS.line}`, borderRadius: 4, marginBottom: 14 },
  tr: { flexDirection: "row", borderBottom: `1px solid ${PDF_COLORS.line}` },
  trLast: { flexDirection: "row" },
  thCell: { flex: 1, padding: 6, backgroundColor: PDF_COLORS.surface, fontSize: 7.5, fontWeight: 700, color: PDF_COLORS.muted, textTransform: "uppercase" },
  tdCell: { flex: 1, padding: 6, fontSize: 8.5 },
  tdMetric: { flex: 1.2, padding: 6, fontSize: 8.5, fontWeight: 700 },
  diagnosticItem: { padding: 6, backgroundColor: PDF_COLORS.surface, borderRadius: 4, marginBottom: 5, fontSize: 8.5 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, borderTop: `1px solid ${PDF_COLORS.line}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: PDF_COLORS.muted },
  legendRow: { flexDirection: "row", marginBottom: 6, gap: 14 },
  legendDot: { fontSize: 8 },
});

function formatValue(value: number, format: "currency" | "integer" | "percent" | "decimal") {
  if (format === "currency") return fmtCurrency(value);
  if (format === "percent") return fmtPercent(value);
  if (format === "decimal") return fmtDecimal(value);
  return fmtInteger(value);
}

function Footer({ page }: { page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>BRAIN Marketing & Performance — suporte@brainmktp.com.br — brainmktp.com.br</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${page} · ${pageNumber}/${totalPages}`} />
    </View>
  );
}

export function ComparisonDocument({ comparison, generatedAt }: { comparison: ComparisonResult; generatedAt: Date }) {
  const { a, b, diffs, diagnostics, client, account, period } = comparison;

  const leadsSeries = [
    { label: a.name, color: PDF_COLORS.seriesA, points: a.trend.map((p) => ({ x: fmtShortDate(p.date), y: p.leads })) },
    { label: b.name, color: PDF_COLORS.seriesB, points: b.trend.map((p) => ({ x: fmtShortDate(p.date), y: p.leads })) },
  ];
  const cplSeries = [
    { label: a.name, color: PDF_COLORS.seriesA, points: a.trend.map((p) => ({ x: fmtShortDate(p.date), y: p.cpl })) },
    { label: b.name, color: PDF_COLORS.seriesB, points: b.trend.map((p) => ({ x: fmtShortDate(p.date), y: p.cpl })) },
  ];

  return (
    <Document title={`Comparativo Brain — ${a.name} vs ${b.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is a PDF primitive, not an HTML/DOM element; it has no alt prop */}
          <Image src={LOGO_PATH} style={styles.logo} />
          <Text style={{ fontSize: 8, color: PDF_COLORS.muted }}>Gerado em {fmtGeneratedAt(generatedAt)}</Text>
        </View>

        <Text style={styles.title}>Comparativo de Campanhas — {client.name}</Text>
        <Text style={styles.subtitle}>
          {account.name} · {fmtDate(period.since)} até {fmtDate(period.until)}
        </Text>

        <View style={styles.vsRow}>
          <View style={[styles.vsCard, styles.vsCardA]}>
            <Text style={styles.vsLabel}>Campanha A</Text>
            <Text style={styles.vsName}>{a.name}</Text>
            <Text style={styles.vsSub}>
              {a.activeDays} dia{a.activeDays === 1 ? "" : "s"} ativo{a.activeDays === 1 ? "" : "s"} no período
            </Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={[styles.vsCard, styles.vsCardB]}>
            <Text style={styles.vsLabel}>Campanha B</Text>
            <Text style={styles.vsName}>{b.name}</Text>
            <Text style={styles.vsSub}>
              {b.activeDays} dia{b.activeDays === 1 ? "" : "s"} ativo{b.activeDays === 1 ? "" : "s"} no período
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Métricas comparadas</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.thCell}>Métrica</Text>
            <Text style={styles.thCell}>{a.name}</Text>
            <Text style={styles.thCell}>{b.name}</Text>
            <Text style={styles.thCell}>Diferença (B vs A)</Text>
          </View>
          {diffs.map((d, i) => (
            <View key={d.key} style={i === diffs.length - 1 ? styles.trLast : styles.tr}>
              <Text style={styles.tdMetric}>{d.label}</Text>
              <Text style={styles.tdCell}>{formatValue(d.a, d.format)}</Text>
              <Text style={styles.tdCell}>{formatValue(d.b, d.format)}</Text>
              <Text style={styles.tdCell}>{d.diffPct === null ? "—" : `${d.diffPct > 0 ? "+" : ""}${d.diffPct.toFixed(1)}%`}</Text>
            </View>
          ))}
        </View>

        {/* wrap={false}: um gráfico SVG cortado ao meio por uma quebra de
            página vira lixo visual (coordenadas internas não "continuam" na
            página seguinte) — força o bloco inteiro (título+legenda+gráfico)
            pra próxima página caso não caiba, em vez de fatiar o SVG. */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>Evolução diária — Leads</Text>
          <View style={styles.legendRow}>
            <Text style={[styles.legendDot, { color: PDF_COLORS.seriesA }]}>• {a.name}</Text>
            <Text style={[styles.legendDot, { color: PDF_COLORS.seriesB }]}>• {b.name}</Text>
          </View>
          <PdfLineChart series={leadsSeries} height={130} />
        </View>

        <View wrap={false} style={{ marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Evolução diária — CPL</Text>
          <View style={styles.legendRow}>
            <Text style={[styles.legendDot, { color: PDF_COLORS.seriesA }]}>• {a.name}</Text>
            <Text style={[styles.legendDot, { color: PDF_COLORS.seriesB }]}>• {b.name}</Text>
          </View>
          <PdfLineChart series={cplSeries} height={130} />
        </View>

        <Text style={styles.sectionTitle}>Diagnóstico comparativo</Text>
        {diagnostics.map((d, i) => (
          <Text key={i} style={styles.diagnosticItem}>
            {d}
          </Text>
        ))}

        <Footer page={`${a.name} vs ${b.name}`} />
      </Page>
    </Document>
  );
}
