import { Svg, Polyline, Line, Text as PdfText, Circle } from "@react-pdf/renderer";
import { PDF_COLORS } from "./theme";

export type ChartSeries = {
  label: string;
  color: string;
  points: { x: string; y: number }[]; // x = date label (categorical), y = valor
};

/**
 * Gráfico de linha minimalista renderizado em SVG puro (primitivas do
 * react-pdf) — sem canvas/screenshot, compatível com geração server-side.
 * Escala é sempre relativa ao próprio conjunto de séries (nunca fixa), pra
 * não distorcer quando os valores forem pequenos (ex.: CPL em reais).
 */
export function PdfLineChart({ series, width = 500, height = 160 }: { series: ChartSeries[]; width?: number; height?: number }) {
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return (
      <Svg width={width} height={height}>
        <PdfText x={width / 2} y={height / 2} style={{ fontSize: 9, fill: PDF_COLORS.muted }}>
          Sem dados no período
        </PdfText>
      </Svg>
    );
  }

  const maxY = Math.max(...allPoints.map((p) => p.y), 0.0001);
  const minY = 0; // métricas do dashboard (spend/leads/cpl) nunca são negativas
  const categories = Array.from(new Set(allPoints.map((p) => p.x)));
  const stepX = categories.length > 1 ? innerW / (categories.length - 1) : 0;

  const xFor = (label: string) => padding.left + categories.indexOf(label) * stepX;
  const yFor = (value: number) => padding.top + innerH - ((value - minY) / (maxY - minY || 1)) * innerH;

  // Só rotula uma amostra do eixo X pra não sobrepor texto em períodos longos.
  const labelEvery = Math.max(1, Math.ceil(categories.length / 6));

  return (
    <Svg width={width} height={height}>
      <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke={PDF_COLORS.line} strokeWidth={1} />
      <Line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke={PDF_COLORS.line}
        strokeWidth={1}
      />

      {categories.map((c, i) =>
        i % labelEvery === 0 ? (
          <PdfText key={c} x={xFor(c) - 8} y={height - padding.bottom + 12} style={{ fontSize: 6, fill: PDF_COLORS.muted }}>
            {c}
          </PdfText>
        ) : null
      )}

      {series.map((s) => {
        const pts = s.points
          .filter((p) => categories.includes(p.x))
          .sort((a, b) => categories.indexOf(a.x) - categories.indexOf(b.x));
        const pointsAttr = pts.map((p) => `${xFor(p.x)},${yFor(p.y)}`).join(" ");
        return (
          <Polyline
            key={s.label}
            points={pointsAttr}
            fill="none"
            stroke={s.color}
            strokeWidth={1.75}
          />
        );
      })}

      {series.map((s) =>
        s.points.map((p) => (
          <Circle key={`${s.label}-${p.x}`} cx={xFor(p.x)} cy={yFor(p.y)} r={1.4} fill={s.color} />
        ))
      )}
    </Svg>
  );
}
