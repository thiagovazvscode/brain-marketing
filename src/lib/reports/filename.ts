// U+0300–U+036F = marcas diacríticas combinantes (o que sobra de "á"/"ã"/"ç"
// depois de normalize("NFD") separar a letra base do acento).
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

// Nome de arquivo seguro pra download — sem acento, sem espaço, sem caractere
// que possa confundir sistema de arquivo ou header Content-Disposition.
export function slugifyForFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildReportFilename(parts: {
  clientSlug: string;
  scopeLabel: string;
  since: string;
  until: string;
  kind: "relatorio" | "comparativo";
  scopeBLabel?: string;
}) {
  const scope = slugifyForFilename(parts.scopeLabel);
  const scopeB = parts.scopeBLabel ? slugifyForFilename(parts.scopeBLabel) : null;
  const middle = scopeB ? `${scope}-vs-${scopeB}` : scope;
  return `brain-${parts.kind}-${slugifyForFilename(parts.clientSlug)}-${middle}-${parts.since}-a-${parts.until}.pdf`;
}
