export type ChampionCandidate = {
  id: string;
  leads: number;
  cpl: number;
  ctrLink: number;
};

// Um anúncio só concorre a "campeão" com pelo menos esse volume de leads —
// evita que 1 lead barato vença 23 leads consistentes só por CPL menor.
const MIN_LEADS_FOR_CHAMPION = 3;

/**
 * Score ponderado: volume de leads pesa mais (50%), eficiência de CPL 30%,
 * CTR de link 20%. Cada componente é normalizado (0-1) contra o melhor valor
 * do próprio conjunto avaliado, então o resultado é sempre relativo ao grupo
 * (uma campanha, um conjunto, ou a conta toda — quem chamar decide o escopo).
 */
export function pickChampion<T extends ChampionCandidate>(candidates: T[]): { champion: T | null; lowSample: boolean } {
  if (candidates.length === 0) return { champion: null, lowSample: true };

  const eligible = candidates.filter((c) => c.leads >= MIN_LEADS_FOR_CHAMPION);
  const pool = eligible.length > 0 ? eligible : candidates;
  const lowSample = eligible.length === 0;

  const maxLeads = Math.max(...pool.map((c) => c.leads), 1);
  const minCpl = Math.min(...pool.filter((c) => c.leads > 0 && c.cpl > 0).map((c) => c.cpl));
  const maxCtrLink = Math.max(...pool.map((c) => c.ctrLink), 0.01);

  let best: T | null = null;
  let bestScore = -Infinity;

  for (const c of pool) {
    const leadsScore = c.leads / maxLeads;
    const cplScore = c.leads > 0 && c.cpl > 0 && Number.isFinite(minCpl) ? minCpl / c.cpl : 0;
    const ctrScore = c.ctrLink / maxCtrLink;
    const score = leadsScore * 0.5 + cplScore * 0.3 + ctrScore * 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return { champion: best, lowSample };
}
