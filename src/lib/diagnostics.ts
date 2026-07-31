export interface DiagnosticScores {
  aquisicao: number;
  posicionamento: number;
  processoComercial: number;
  tecnologia: number;
}

export interface DiagnosticRecommendation {
  productSlug: string;
  reason: string;
}

const PILLAR_TO_PRODUCT: Record<keyof DiagnosticScores, { slug: string; label: string; pillarLabel: string }> = {
  aquisicao: { slug: "trafego-pago", label: "Tráfego pago e aquisição", pillarLabel: "aquisição" },
  posicionamento: { slug: "posicionamento", label: "Posicionamento", pillarLabel: "posicionamento" },
  processoComercial: {
    slug: "inteligencia-comercial",
    label: "Inteligência comercial",
    pillarLabel: "processo comercial",
  },
  tecnologia: { slug: "tecnologia", label: "Broker Apps", pillarLabel: "tecnologia" },
};

/**
 * Regra simples e explícita (não é machine learning): o(s) pilar(es) com
 * menor nota mapeiam para um produto fixo do catálogo. Produtos já
 * contratados como engajamento "ativo" são excluídos — esses já aparecem
 * como contratados, recomendar de novo não ajuda.
 */
export function computeBottleneck(scores: DiagnosticScores): string {
  const entries = Object.entries(scores) as [keyof DiagnosticScores, number][];
  entries.sort((a, b) => a[1] - b[1]);
  return PILLAR_TO_PRODUCT[entries[0][0]].pillarLabel;
}

export function computeRecommendations(
  scores: DiagnosticScores,
  activeProductSlugs: string[],
  maxItems = 2
): DiagnosticRecommendation[] {
  const entries = Object.entries(scores) as [keyof DiagnosticScores, number][];
  entries.sort((a, b) => a[1] - b[1]);

  const recommendations: DiagnosticRecommendation[] = [];
  const seenSlugs = new Set<string>();

  for (const [pillar, score] of entries) {
    const product = PILLAR_TO_PRODUCT[pillar];
    if (activeProductSlugs.includes(product.slug) || seenSlugs.has(product.slug)) continue;

    recommendations.push({
      productSlug: product.slug,
      reason: `Nota ${score}/10 em ${product.pillarLabel} é uma das mais baixas da avaliação — ${product.label} ataca esse gargalo diretamente.`,
    });
    seenSlugs.add(product.slug);

    if (recommendations.length >= maxItems) break;
  }

  return recommendations;
}
