// Paleta do PDF institucional Brain — fundo claro de propósito (documento pra
// imprimir/compartilhar, não uma réplica 1:1 do dashboard escuro). Os tons de
// azul reaproveitam o brand-primary do site (src/app/globals.css).
export const PDF_COLORS = {
  brandPrimary: "#2563eb",
  brandDark: "#0f172a",
  ink: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  surface: "#f8fafc",
  positive: "#16a34a",
  warning: "#b45309",
  seriesA: "#2563eb",
  seriesB: "#eb6834",
};

export function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function fmtInteger(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}
export function fmtPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
export function fmtDecimal(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtDate(value: string) {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}
export function fmtShortDate(value: string) {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
}
export function fmtGeneratedAt(date: Date) {
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
