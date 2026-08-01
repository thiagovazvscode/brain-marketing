// Domínio de Métodos & Execução — Etapa 1 (specs/metodos-execucao).
//
// content_status e playbook_type são pgEnum (conjuntos pequenos e fixos, o
// pedido lista os 9 tipos de playbook explicitamente). "Categoria" de método
// e URL/descrição de recurso ficam livres — igual products.category, sem
// taxonomia própria — o filtro de categoria na biblioteca lê os valores
// distintos já cadastrados, não uma lista hardcoded.

export const CONTENT_STATUS = [
  { id: "rascunho", label: "Rascunho", color: "#f59e0b" },
  { id: "em_revisao", label: "Em revisão", color: "#6366f1" },
  { id: "publicado", label: "Publicado", color: "#16a34a" },
  { id: "arquivado", label: "Arquivado", color: "#64748b" },
] as const;

export type ContentStatusId = (typeof CONTENT_STATUS)[number]["id"];

export const PLAYBOOK_TYPES = [
  { id: "implantacao", label: "Implantação" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "projeto", label: "Projeto" },
  { id: "recorrente", label: "Recorrente" },
  { id: "treinamento", label: "Treinamento" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "manutencao", label: "Manutenção" },
  { id: "renovacao", label: "Renovação" },
  { id: "encerramento", label: "Encerramento" },
] as const;

export type PlaybookTypeId = (typeof PLAYBOOK_TYPES)[number]["id"];

export const RESOURCE_TYPES = [
  { id: "briefing", label: "Briefing" },
  { id: "checklist", label: "Checklist" },
  { id: "documento", label: "Documento" },
  { id: "modelo", label: "Modelo" },
  { id: "apresentacao", label: "Apresentação" },
  { id: "mensagem", label: "Mensagem" },
  { id: "outro", label: "Outro" },
] as const;

export type ResourceTypeId = (typeof RESOURCE_TYPES)[number]["id"];

function labelOf(list: readonly { id: string; label: string }[], id: string | null): string {
  if (!id) return "—";
  return list.find((item) => item.id === id)?.label ?? id;
}

export const contentStatusLabel = (id: string | null) => labelOf(CONTENT_STATUS, id);
export const contentStatusColor = (id: string | null) => CONTENT_STATUS.find((s) => s.id === id)?.color ?? "#64748b";
export const playbookTypeLabel = (id: string | null) => labelOf(PLAYBOOK_TYPES, id);
export const resourceTypeLabel = (id: string | null) => labelOf(RESOURCE_TYPES, id);

export const isValidContentStatus = (id: string): id is ContentStatusId =>
  CONTENT_STATUS.some((s) => s.id === id);
export const isValidPlaybookType = (id: string): id is PlaybookTypeId => PLAYBOOK_TYPES.some((s) => s.id === id);
export const isValidResourceType = (id: string): id is ResourceTypeId => RESOURCE_TYPES.some((s) => s.id === id);

/**
 * Link de recurso: vazio é permitido (campo opcional), mas se preenchido só
 * aceita http/https. Bloqueia javascript:, data:, vbscript:, file: e afins —
 * o valor é digitado por um admin e renderizado como href para outro admin
 * clicar, então um esquema executável vira XSS armazenado entre contas.
 * Checa o protocolo já normalizado pelo parser de `URL`, não a string crua.
 */
export function isValidResourceUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** "1.0" → "1.1", "2.3" → "2.4". Reinicia a casa decimal em "1" se o rótulo fugir do padrão x.y. */
export function bumpVersion(version: string): string {
  const [majorRaw, minorRaw] = version.split(".");
  const major = majorRaw?.trim() || "1";
  const minor = parseInt(minorRaw ?? "", 10);
  return `${major}.${Number.isNaN(minor) ? 1 : minor + 1}`;
}

/**
 * Regra de versionamento (item 10 do pedido): uma versão publicada nunca é
 * editada in-place. Editar (ou pedir nova versão de) um método/playbook
 * `publicado` volta o registro para rascunho com a versão seguinte — o
 * snapshot do estado publicado já foi gravado por publish(), então essa
 * transição não grava outro.
 *
 * Função pura e centralizada de propósito: as rotas PATCH e new-version de
 * método e de playbook chamam a mesma decisão, em vez de reimplementar a
 * regra cada uma do seu jeito e arriscar corromper uma versão publicada.
 */
export function computeVersionTransition(
  currentStatus: string,
  currentVersion: string
): { nextStatus: "rascunho"; nextVersion: string } | null {
  if (currentStatus !== "publicado") return null;
  return {
    nextStatus: "rascunho",
    nextVersion: bumpVersion(currentVersion),
  };
}
