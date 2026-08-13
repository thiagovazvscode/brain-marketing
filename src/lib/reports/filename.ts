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

export function buildLeadsFilename(parts: {
  clientSlug: string;
  campaignNames: string[];
  since: string;
  until: string;
  extension: "xlsx" | "csv";
}) {
  // Uma campanha: usa o nome dela no arquivo (mesmo padrão do PDF). Duas ou
  // mais: "N-campanhas" — o nome de N campanhas concatenadas viraria um
  // arquivo ilegível.
  const scope =
    parts.campaignNames.length === 1
      ? slugifyForFilename(parts.campaignNames[0])
      : `${parts.campaignNames.length}-campanhas`;
  return `brain-${slugifyForFilename(parts.clientSlug)}-${scope}-${parts.since}-a-${parts.until}.${parts.extension}`;
}
