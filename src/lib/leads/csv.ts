import type { LeadRecord } from "./types";

// Neutraliza interpretação como fórmula ao abrir em Excel/Sheets (=, +, -, @
// no início de uma célula) — proteção padrão contra CSV injection quando o
// conteúdo vem de campo preenchido por usuário (nome/respostas de formulário).
function sanitizeCsvCell(value: unknown): string {
  const s = String(value ?? "");
  const guarded = /^[=+\-@]/.test(s) ? `'${s}` : s;
  const escaped = guarded.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function dedupedMailing(leads: LeadRecord[]): LeadRecord[] {
  const seen = new Set<string>();
  const out: LeadRecord[] = [];
  for (const l of leads) {
    const key = (l.phone || l.email || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

/**
 * CSV UTF-8 (com BOM, pra Excel reconhecer acentuação corretamente) — duas
 * variantes: base completa (mesmas colunas da aba Leads) ou mailing
 * consolidado/deduplicado (mesmas colunas da aba Mailing).
 */
export function buildLeadsCsv(leads: LeadRecord[], variant: "completa" | "mailing"): string {
  let rows: unknown[][];

  if (variant === "mailing") {
    rows = [["Nome", "Telefone", "E-mail", "Campanha de origem", "Data"]];
    for (const l of dedupedMailing(leads)) {
      rows.push([l.name, l.phone, l.email ?? "", l.campaignName, l.capturedAt]);
    }
  } else {
    const customKeys = Array.from(new Set(leads.flatMap((l) => Object.keys(l.customFields))));
    rows = [["Data/Hora", "Nome", "Telefone", "E-mail", "Campanha", "Conjunto", "Anúncio", "Formulário", ...customKeys]];
    for (const l of leads) {
      rows.push([
        l.capturedAt,
        l.name,
        l.phone,
        l.email ?? "",
        l.campaignName,
        l.adsetName ?? "",
        l.adName ?? "",
        l.formName ?? "",
        ...customKeys.map((k) => l.customFields[k] ?? ""),
      ]);
    }
  }

  const body = rows.map((row) => row.map(sanitizeCsvCell).join(",")).join("\r\n");
  const BOM = String.fromCharCode(0xfeff); // sem isso o Excel abre acentuação quebrada
  return BOM + body;
}
