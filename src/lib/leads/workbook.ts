import ExcelJS from "exceljs";
import type { LeadRecord } from "./types";

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
 * Workbook de 3 abas — Resumo / Leads / Mailing. Recebe LeadRecord[] já
 * resolvido (nunca busca dados sozinho) — quem chama decide a fonte,
 * mantendo esta função pura e testável independente de
 * src/lib/leads/source.ts estar disponível ou não.
 */
export async function buildLeadsWorkbook(params: {
  clientName: string;
  since: string;
  until: string;
  campaignNames: string[];
  leads: LeadRecord[];
}): Promise<Buffer> {
  const { clientName, since, until, campaignNames, leads } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Brain Marketing & Performance";
  wb.created = new Date();

  // ── Aba 1 — Resumo ──
  const resumo = wb.addWorksheet("Resumo");
  resumo.columns = [{ width: 24 }, { width: 50 }];
  resumo.addRow(["Cliente", clientName]);
  resumo.addRow(["Período", `${since} a ${until}`]);
  resumo.addRow(["Campanhas", campaignNames.join(", ") || "—"]);
  resumo.addRow([]);
  const headerRow = resumo.addRow(["Campanha", "Leads"]);
  headerRow.font = { bold: true };

  const byCampaign = new Map<string, number>();
  for (const l of leads) byCampaign.set(l.campaignName, (byCampaign.get(l.campaignName) ?? 0) + 1);
  for (const [name, count] of byCampaign) resumo.addRow([name, count]);
  const totalRow = resumo.addRow(["Total", leads.length]);
  totalRow.font = { bold: true };

  // ── Aba 2 — Leads (uma linha por submissão real) ──
  const customKeys = Array.from(new Set(leads.flatMap((l) => Object.keys(l.customFields))));
  const leadsSheet = wb.addWorksheet("Leads");
  leadsSheet.columns = [
    { header: "Data/Hora", key: "capturedAt", width: 20 },
    { header: "Nome", key: "name", width: 28 },
    { header: "Telefone", key: "phone", width: 18 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Campanha", key: "campaignName", width: 30 },
    { header: "Conjunto", key: "adsetName", width: 30 },
    { header: "Anúncio", key: "adName", width: 30 },
    { header: "Formulário", key: "formName", width: 24 },
    ...customKeys.map((k) => ({ header: k, key: k, width: 24 })),
  ];
  for (const l of leads) leadsSheet.addRow({ ...l, ...l.customFields });
  leadsSheet.getRow(1).font = { bold: true };

  // ── Aba 3 — Mailing (deduplicado por telefone, senão e-mail) ──
  const mailingSheet = wb.addWorksheet("Mailing");
  mailingSheet.columns = [
    { header: "Nome", key: "name", width: 28 },
    { header: "Telefone", key: "phone", width: 18 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Campanha de origem", key: "campaignName", width: 30 },
    { header: "Data", key: "capturedAt", width: 20 },
  ];
  for (const l of dedupedMailing(leads)) mailingSheet.addRow(l);
  mailingSheet.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
