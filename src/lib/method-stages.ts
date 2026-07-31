// Espelha src/data/method.ts (ids/ordem) — estágios do Método Brain.
// Texto validado em app-level, não pgEnum: é metodologia estável da marca,
// mas ainda assim evitamos o mesmo acoplamento rígido que um enum de banco
// criaria (mesmo raciocínio de "products" ser tabela, não enum).
export const METHOD_STAGES = [
  { id: "raio-x", label: "Raio-X" },
  { id: "direcao", label: "Direção" },
  { id: "estrutura", label: "Estrutura" },
  { id: "motor-de-aquisicao", label: "Motor de aquisição" },
  { id: "curva-de-otimizacao", label: "Curva de otimização" },
] as const;

export type MethodStageId = (typeof METHOD_STAGES)[number]["id"];

export const METHOD_STAGE_IDS = METHOD_STAGES.map((s) => s.id) as MethodStageId[];

export function methodStageLabel(id: string): string {
  return METHOD_STAGES.find((s) => s.id === id)?.label ?? id;
}

export function isValidMethodStage(id: string): id is MethodStageId {
  return METHOD_STAGE_IDS.includes(id as MethodStageId);
}

export function nextMethodStage(id: string): MethodStageId | null {
  const index = METHOD_STAGE_IDS.indexOf(id as MethodStageId);
  if (index === -1 || index === METHOD_STAGE_IDS.length - 1) return null;
  return METHOD_STAGE_IDS[index + 1];
}
