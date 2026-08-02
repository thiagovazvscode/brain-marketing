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

// ── Fase 2.1 — Construtor visual de playbooks ───────────────────────────
//
// Os helpers que tocam banco (ensureDraftVersion, loadStageInVersion,
// loadBlockInStage) ficam em src/lib/playbook-builder.ts, não aqui: este
// arquivo é importado por componentes client (StatusBadge, PlaybookForm
// etc.) e não pode puxar "@/db" pro bundle do navegador.

export const PLAYBOOK_BLOCK_PRIORITIES = [
  { id: "baixa", label: "Baixa" },
  { id: "media", label: "Média" },
  { id: "alta", label: "Alta" },
  { id: "critica", label: "Crítica" },
] as const;

export type PlaybookBlockPriorityId = (typeof PLAYBOOK_BLOCK_PRIORITIES)[number]["id"];

export const DURATION_UNITS = [
  { id: "horas", label: "Horas" },
  { id: "dias_corridos", label: "Dias corridos" },
  { id: "dias_uteis", label: "Dias úteis" },
  { id: "semanas", label: "Semanas" },
] as const;

export type DurationUnitId = (typeof DURATION_UNITS)[number]["id"];

// Os 2 primeiros são implementados nesta rodada (active: true); os demais
// aparecem na barra "Adicionar bloco" desabilitados, com rótulo de próxima
// entrega — não fingir que estão funcionais (regra explícita do pedido).
export const PLAYBOOK_BLOCK_TYPES = [
  { id: "internal_task", label: "Tarefa interna", active: true },
  { id: "client_request", label: "Solicitação ao cliente", active: true },
  { id: "meeting", label: "Reunião", active: false },
  { id: "checklist", label: "Checklist", active: false },
  { id: "form_briefing", label: "Formulário ou briefing", active: false },
  { id: "document", label: "Documento", active: false },
  { id: "analysis", label: "Análise", active: false },
  { id: "deliverable", label: "Entregável", active: false },
  { id: "approval", label: "Aprovação", active: false },
  { id: "wait", label: "Espera", active: false },
  { id: "milestone", label: "Marco", active: false },
  { id: "condition", label: "Condição", active: false },
] as const;

export type PlaybookBlockTypeId = (typeof PLAYBOOK_BLOCK_TYPES)[number]["id"];

export const DUE_OFFSET_ANCHORS = [
  { id: "apos_inicio_etapa", label: "Após início da etapa" },
  { id: "apos_bloco_anterior", label: "Após conclusão do bloco anterior" },
  { id: "antes_termino_etapa", label: "Antes do término da etapa" },
] as const;

export type DueOffsetAnchorId = (typeof DUE_OFFSET_ANCHORS)[number]["id"];

// "gerar_tarefa_cobranca" foi renomeado pra "criar_tarefa_followup" —
// refinamento visual/UX (Fase 2.1): o rótulo antigo podia ser confundido com
// cobrança financeira, e esse follow-up é sobre a pendência operacional do
// bloco, não sobre cobrar o cliente. Campo é texto livre (não enum do
// banco), então blocos já salvos com o id antigo continuam intactos — só
// aparecem sem opção selecionada no dropdown até serem reeditados.
export const OVERDUE_ACTIONS = [
  { id: "alertar", label: "Apenas alertar" },
  { id: "notificar_responsavel", label: "Notificar responsável" },
  { id: "criar_tarefa_followup", label: "Criar tarefa de follow-up" },
  { id: "marcar_em_risco", label: "Marcar etapa como em risco" },
] as const;

export type OverdueActionId = (typeof OVERDUE_ACTIONS)[number]["id"];

// Correção pós-homologação da Fase 2.1: playbook é modelo reaplicável, não
// dá pra travar o responsável interno num admin_user específico (hoje só
// existe 1 conta). 3 modalidades, enum fixo no banco (não cresce).
export const PLAYBOOK_BLOCK_ASSIGNEE_TYPES = [
  { id: "papel_padrao", label: "Papel padrão" },
  { id: "usuario_especifico", label: "Usuário específico" },
  { id: "definir_ao_aplicar", label: "Definir ao aplicar ao cliente" },
] as const;

export type PlaybookBlockAssigneeTypeId = (typeof PLAYBOOK_BLOCK_ASSIGNEE_TYPES)[number]["id"];

// Lista que tende a crescer (novos papéis de equipe) — texto validado em
// app, mesmo raciocínio de overdueAction/dueOffsetAnchor, não enum do banco.
export const PLAYBOOK_ASSIGNEE_ROLES = [
  { id: "consultor_responsavel", label: "Consultor responsável" },
  { id: "gestor_trafego", label: "Gestor de tráfego" },
  { id: "gestor_comercial", label: "Gestor comercial" },
  { id: "atendimento", label: "Atendimento" },
  { id: "designer", label: "Designer" },
  { id: "editor", label: "Editor" },
  { id: "desenvolvedor", label: "Desenvolvedor" },
  { id: "administrador", label: "Administrador" },
] as const;

export type PlaybookAssigneeRoleId = (typeof PLAYBOOK_ASSIGNEE_ROLES)[number]["id"];

export const playbookBlockAssigneeTypeLabel = (id: string | null) => labelOf(PLAYBOOK_BLOCK_ASSIGNEE_TYPES, id);
export const playbookAssigneeRoleLabel = (id: string | null) => labelOf(PLAYBOOK_ASSIGNEE_ROLES, id);

export const isValidPlaybookBlockAssigneeType = (id: string): id is PlaybookBlockAssigneeTypeId =>
  PLAYBOOK_BLOCK_ASSIGNEE_TYPES.some((s) => s.id === id);
export const isValidPlaybookAssigneeRole = (id: string): id is PlaybookAssigneeRoleId =>
  PLAYBOOK_ASSIGNEE_ROLES.some((s) => s.id === id);

export const playbookBlockPriorityLabel = (id: string | null) => labelOf(PLAYBOOK_BLOCK_PRIORITIES, id);
export const durationUnitLabel = (id: string | null) => labelOf(DURATION_UNITS, id);
export const playbookBlockTypeLabel = (id: string | null) => labelOf(PLAYBOOK_BLOCK_TYPES, id);
export const dueOffsetAnchorLabel = (id: string | null) => labelOf(DUE_OFFSET_ANCHORS, id);
export const overdueActionLabel = (id: string | null) => labelOf(OVERDUE_ACTIONS, id);

export const isValidPlaybookBlockPriority = (id: string): id is PlaybookBlockPriorityId =>
  PLAYBOOK_BLOCK_PRIORITIES.some((s) => s.id === id);
export const isValidDurationUnit = (id: string): id is DurationUnitId => DURATION_UNITS.some((s) => s.id === id);
export const isValidPlaybookBlockType = (id: string): id is PlaybookBlockTypeId =>
  PLAYBOOK_BLOCK_TYPES.some((s) => s.id === id);
export const isActivePlaybookBlockType = (id: string): boolean =>
  PLAYBOOK_BLOCK_TYPES.some((s) => s.id === id && s.active);
export const isValidDueOffsetAnchor = (id: string): id is DueOffsetAnchorId => DUE_OFFSET_ANCHORS.some((s) => s.id === id);
export const isValidOverdueAction = (id: string): id is OverdueActionId => OVERDUE_ACTIONS.some((s) => s.id === id);

export type StageConfigStatus = "completa" | "incompleta" | "alerta" | "sem_configuracao";

interface StageConfigInput {
  name: string;
  objective: string | null;
  durationValue: number | null;
  isRequired: boolean;
  completionCriteria: string | null;
}

interface BlockConfigInput {
  title: string;
  isRequired: boolean;
  defaultAssigneeId: string | null;
  externalResponsibleRole: string | null;
  dueOffsetValue: number | null;
}

/**
 * Status de configuração da etapa — computado na leitura, não persistido.
 * Mesmo raciocínio já documentado em schema.ts para "dias na etapa"
 * (opportunities.stageEnteredAt): depende de campos que já estão
 * carregados junto com a etapa e seus blocos, e uma coluna materializada
 * ficaria defasada a cada edição de bloco filho sem disparo explícito.
 *
 * completa        → etapa com nome+objetivo+duração e (se obrigatória) com
 *                    critério de conclusão, e nenhum bloco obrigatório
 *                    incompleto.
 * alerta           → etapa configurada, mas tem bloco obrigatório sem
 *                    responsável ou sem prazo.
 * sem_configuracao → sem nenhum bloco.
 * incompleta       → qualquer outro caso (faltam campos da própria etapa).
 */
export function computeStageConfigStatus(stage: StageConfigInput, blocks: BlockConfigInput[]): StageConfigStatus {
  const stageBaseOk = Boolean(stage.name.trim()) && Boolean(stage.objective?.trim()) && stage.durationValue != null;
  const stageCriteriaOk = !stage.isRequired || Boolean(stage.completionCriteria?.trim());

  if (!stageBaseOk || !stageCriteriaOk) return "incompleta";
  if (blocks.length === 0) return "sem_configuracao";

  const hasAlert = blocks.some((block) => {
    if (!block.isRequired) return false;
    const hasResponsible = Boolean(block.defaultAssigneeId) || Boolean(block.externalResponsibleRole?.trim());
    const hasDeadline = block.dueOffsetValue != null;
    return !block.title.trim() || !hasResponsible || !hasDeadline;
  });

  return hasAlert ? "alerta" : "completa";
}
