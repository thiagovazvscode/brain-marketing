export type Diagnostic = { type: "positive" | "warning" | "info"; message: string };

type CampaignForDiagnosis = {
  name: string;
  status: string | null;
  spend: number;
  leads: number;
  cpl: number;
  ctrLink: number;
  linkClicks: number;
};

type TrendPoint = { date: string; frequency: number; ctrLink: number; cpl: number };

/**
 * Regras determinísticas — nada de IA/GPT nesta fase. Cada regra deriva
 * direto dos números já calculados; quando a leitura é uma inferência (não
 * um fato), o texto usa "pode indicar"/"possível"/"sinal de".
 */
export function buildCampaignDiagnostics(
  campaign: CampaignForDiagnosis,
  accountAvgCpl: number,
  trend: TrendPoint[]
): Diagnostic[] {
  const out: Diagnostic[] = [];

  if (campaign.status !== "ACTIVE") return out; // sem diagnóstico pra campanha pausada/arquivada

  if (campaign.leads >= 5 && campaign.cpl > 0 && accountAvgCpl > 0 && campaign.cpl < accountAvgCpl * 0.85) {
    out.push({
      type: "positive",
      message: `${campaign.name} tem o CPL abaixo da média da conta no período — bom desempenho.`,
    });
  }

  if (campaign.spend > 50 && campaign.leads === 0) {
    out.push({
      type: "warning",
      message: `${campaign.name} teve investimento relevante sem gerar leads no período — atenção.`,
    });
  } else if (campaign.ctrLink > 1.5 && campaign.leads === 0 && campaign.linkClicks > 10) {
    out.push({
      type: "warning",
      message: `${campaign.name} tem CTR de link saudável mas 0 leads — pode indicar problema pós-clique (formulário/página de destino).`,
    });
  }

  // Fadiga: compara primeiro terço do período com o último terço, se houver
  // dado diário suficiente (mínimo 6 dias pra dividir em 3 partes com sentido).
  if (trend.length >= 6) {
    const third = Math.floor(trend.length / 3);
    const early = trend.slice(0, third);
    const late = trend.slice(-third);
    const avg = (arr: TrendPoint[], key: keyof TrendPoint) =>
      arr.reduce((s, p) => s + (Number(p[key]) || 0), 0) / Math.max(arr.length, 1);

    const freqUp = avg(late, "frequency") > avg(early, "frequency") * 1.15;
    const ctrDown = avg(late, "ctrLink") < avg(early, "ctrLink") * 0.85;
    const cplUp = avg(late, "cpl") > avg(early, "cpl") * 1.15 && avg(early, "cpl") > 0;

    if (freqUp && ctrDown && cplUp) {
      out.push({
        type: "warning",
        message: `${campaign.name}: frequência subindo, CTR de link caindo e CPL subindo — sinal de possível fadiga de criativo.`,
      });
    }
  }

  return out;
}
