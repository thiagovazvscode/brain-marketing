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

// Fase 2.1: só os 2 primeiros (active:true). Fase 2.2A: seletor já mostra
// meeting/checklist/form_briefing/document com categoria/cor/descrição
// definitivas, mas active:false até o construtor de cada um existir (steps
// 7-14 do plano, depois da autorização da migration) — vira active:true tipo
// por tipo, nunca todos de uma vez, regra explícita de não fingir
// funcionalidade. Os 6 finais são as "próximas entregas" de verdade.
export const PLAYBOOK_BLOCK_TYPES = [
  { id: "internal_task", label: "Tarefa interna", active: true, category: "execucao", description: "Atividade executada pela equipe interna.", color: "violet" },
  { id: "client_request", label: "Solicitação ao cliente", active: true, category: "execucao", description: "Solicitações de informações ou ações para o cliente.", color: "blue" },
  { id: "checklist", label: "Checklist", active: true, category: "execucao", description: "Lista de itens que precisam ser verificados ou concluídos.", color: "teal" },
  { id: "meeting", label: "Reunião", active: true, category: "interacao", description: "Reuniões e encontros com o cliente ou equipe.", color: "orange" },
  { id: "form_briefing", label: "Formulário / Briefing", active: true, category: "interacao", description: "Coleta estruturada de informações com o cliente ou equipe.", color: "pink" },
  { id: "document", label: "Documento", active: true, category: "conteudo", description: "Documentos necessários, de referência ou produzidos.", color: "slate" },
  { id: "analysis", label: "Análise", active: false, category: "futuro", description: "Análise estruturada de dados ou contexto do cliente.", color: "slate" },
  { id: "deliverable", label: "Entregável", active: false, category: "futuro", description: "Entrega formal de um resultado ao cliente.", color: "slate" },
  { id: "approval", label: "Aprovação", active: false, category: "futuro", description: "Aprovação formal de uma etapa ou entrega.", color: "slate" },
  { id: "milestone", label: "Marco", active: false, category: "futuro", description: "Marco de referência na linha do tempo do playbook.", color: "slate" },
  { id: "wait", label: "Espera", active: false, category: "futuro", description: "Período de espera antes de seguir para o próximo bloco.", color: "slate" },
  { id: "condition", label: "Condição", active: false, category: "futuro", description: "Ramificação condicional entre blocos.", color: "slate" },
] as const;

export type PlaybookBlockTypeId = (typeof PLAYBOOK_BLOCK_TYPES)[number]["id"];

export const PLAYBOOK_BLOCK_CATEGORIES = [
  { id: "execucao", label: "Execução" },
  { id: "interacao", label: "Interação" },
  { id: "conteudo", label: "Conteúdo e arquivos" },
  { id: "futuro", label: "Próximas entregas" },
] as const;

// ── Fase 2.2A — Reunião, Checklist, Formulário/Briefing, Documento ─────────
// Todas as listas abaixo são texto validado em app (mesmo raciocínio de
// overdueAction/dueOffsetAnchor): conjuntos que tendem a crescer, guardados
// em playbook_block_templates.metadata (Reunião/Documento) ou em colunas de
// texto nas tabelas filhas (Checklist/Formulário) — nunca enum do banco.

export const MEETING_TYPES = [
  { id: "imersao", label: "Imersão" },
  { id: "alinhamento", label: "Alinhamento" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "devolutiva", label: "Devolutiva" },
  { id: "treinamento", label: "Treinamento" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "personalizada", label: "Reunião personalizada" },
] as const;

export const MEETING_DURATION_UNITS = [
  { id: "minutos", label: "Minutos" },
  { id: "horas", label: "Horas" },
] as const;

export const MEETING_FORMATS = [
  { id: "online", label: "Online" },
  { id: "presencial", label: "Presencial" },
  { id: "hibrido", label: "Híbrido" },
  { id: "definir_posteriormente", label: "Definir posteriormente" },
] as const;

// Reaproveitado pelo participante externo principal da Reunião e pelo
// respondente do Formulário — mesmo conjunto citado nas duas seções do pedido.
export const PLAYBOOK_EXTERNAL_CONTACT_ROLES = [
  { id: "socio", label: "Sócio" },
  { id: "gestor_comercial_cliente", label: "Gestor comercial" },
  { id: "responsavel_atendimento", label: "Responsável pelo atendimento" },
  { id: "equipe_vendas", label: "Equipe de vendas" },
  { id: "financeiro_cliente", label: "Financeiro" },
  { id: "marketing_cliente", label: "Marketing" },
  { id: "outro", label: "Outro" },
] as const;

export const DOCUMENT_KINDS = [
  { id: "necessario", label: "Documento necessário" },
  { id: "referencia", label: "Documento de referência" },
  { id: "produzido", label: "Documento produzido" },
] as const;

export const DOCUMENT_ORIGINS = [
  { id: "brain", label: "Brain" },
  { id: "cliente", label: "Cliente" },
  { id: "externo", label: "Externo" },
  { id: "definir_ao_aplicar", label: "Definir ao aplicar" },
] as const;

export const DOCUMENT_CATEGORIES = [
  { id: "contrato", label: "Contrato" },
  { id: "relatorio", label: "Relatório" },
  { id: "planilha", label: "Planilha" },
  { id: "apresentacao", label: "Apresentação" },
  { id: "briefing", label: "Briefing" },
  { id: "evidencia", label: "Evidência" },
  { id: "material_apoio", label: "Material de apoio" },
  { id: "outro", label: "Outro" },
] as const;

export const DOCUMENT_FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "doc", label: "DOC" },
  { id: "docx", label: "DOCX" },
  { id: "xls", label: "XLS" },
  { id: "xlsx", label: "XLSX" },
  { id: "csv", label: "CSV" },
  { id: "jpg", label: "JPG" },
  { id: "png", label: "PNG" },
  { id: "zip", label: "ZIP" },
  { id: "url", label: "URL" },
  { id: "outro", label: "Outro" },
] as const;

export const DOCUMENT_VISIBILITY = [
  { id: "equipe_brain", label: "Apenas equipe Brain" },
  { id: "equipe_e_cliente", label: "Equipe e cliente" },
  { id: "apenas_responsaveis", label: "Apenas responsáveis" },
  { id: "definir_ao_aplicar", label: "Definir ao aplicar" },
] as const;

export const FORM_RESPONDENT_TYPES = [
  { id: "cliente", label: "Cliente" },
  { id: "equipe_brain", label: "Equipe Brain" },
  { id: "ambos", label: "Ambos" },
  { id: "definir_ao_aplicar", label: "Definir ao aplicar" },
] as const;

export const FORM_QUESTION_TYPES = [
  { id: "texto_curto", label: "Texto curto" },
  { id: "texto_longo", label: "Texto longo" },
  { id: "numero", label: "Número" },
  { id: "moeda", label: "Moeda" },
  { id: "data", label: "Data" },
  { id: "selecao_unica", label: "Seleção única" },
  { id: "multipla_selecao", label: "Múltipla seleção" },
  { id: "sim_nao", label: "Sim ou não" },
  { id: "arquivo", label: "Arquivo" },
  { id: "url", label: "URL" },
] as const;

export type FormQuestionTypeId = (typeof FORM_QUESTION_TYPES)[number]["id"];
// Tipos que exigem lista de opções (>= 2) — mesma regra pros dois.
export const FORM_QUESTION_TYPES_WITH_OPTIONS: FormQuestionTypeId[] = ["selecao_unica", "multipla_selecao"];

// Limites defensivos (item 19 do pedido) — nunca confiar só no frontend.
export const MAX_CHECKLIST_ITEMS_PER_BLOCK = 100;
export const MAX_FORM_QUESTIONS_PER_BLOCK = 100;
export const MAX_FORM_QUESTION_OPTIONS = 100;
export const MAX_SHORT_TEXT_LENGTH = 300;
export const MAX_LONG_TEXT_LENGTH = 4000;
export const MAX_LIST_ENTRY_LENGTH = 500;
export const MAX_LIST_ENTRIES = 50;

export const meetingTypeLabel = (id: string | null) => labelOf(MEETING_TYPES, id);
export const meetingDurationUnitLabel = (id: string | null) => labelOf(MEETING_DURATION_UNITS, id);
export const meetingFormatLabel = (id: string | null) => labelOf(MEETING_FORMATS, id);
export const externalContactRoleLabel = (id: string | null) => labelOf(PLAYBOOK_EXTERNAL_CONTACT_ROLES, id);
export const documentKindLabel = (id: string | null) => labelOf(DOCUMENT_KINDS, id);
export const documentOriginLabel = (id: string | null) => labelOf(DOCUMENT_ORIGINS, id);
export const documentCategoryLabel = (id: string | null) => labelOf(DOCUMENT_CATEGORIES, id);
export const documentFormatLabel = (id: string | null) => labelOf(DOCUMENT_FORMATS, id);
export const documentVisibilityLabel = (id: string | null) => labelOf(DOCUMENT_VISIBILITY, id);
export const formRespondentTypeLabel = (id: string | null) => labelOf(FORM_RESPONDENT_TYPES, id);
export const formQuestionTypeLabel = (id: string | null) => labelOf(FORM_QUESTION_TYPES, id);

export const isValidMeetingType = (id: string) => MEETING_TYPES.some((s) => s.id === id);
export const isValidMeetingDurationUnit = (id: string) => MEETING_DURATION_UNITS.some((s) => s.id === id);
export const isValidMeetingFormat = (id: string) => MEETING_FORMATS.some((s) => s.id === id);
export const isValidExternalContactRole = (id: string) => PLAYBOOK_EXTERNAL_CONTACT_ROLES.some((s) => s.id === id);
export const isValidDocumentKind = (id: string) => DOCUMENT_KINDS.some((s) => s.id === id);
export const isValidDocumentOrigin = (id: string) => DOCUMENT_ORIGINS.some((s) => s.id === id);
export const isValidDocumentCategory = (id: string) => DOCUMENT_CATEGORIES.some((s) => s.id === id);
export const isValidDocumentFormat = (id: string) => DOCUMENT_FORMATS.some((s) => s.id === id);
export const isValidDocumentVisibility = (id: string) => DOCUMENT_VISIBILITY.some((s) => s.id === id);
export const isValidFormRespondentType = (id: string) => FORM_RESPONDENT_TYPES.some((s) => s.id === id);
export const isValidFormQuestionType = (id: string): id is FormQuestionTypeId => FORM_QUESTION_TYPES.some((s) => s.id === id);

/** Só deixa passar chaves conhecidas com o tipo certo — nunca confia no shape que vier do cliente. */
export function sanitizeFormQuestionValidation(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof src.minLength === "number" && src.minLength >= 0) out.minLength = src.minLength;
  if (typeof src.maxLength === "number" && src.maxLength >= 0) out.maxLength = src.maxLength;
  if (typeof src.minValue === "number") out.minValue = src.minValue;
  if (typeof src.maxValue === "number") out.maxValue = src.maxValue;
  if (Array.isArray(src.allowedFormats)) out.allowedFormats = src.allowedFormats.filter((f) => typeof f === "string").slice(0, 20);
  return Object.keys(out).length > 0 ? out : null;
}

/** Seleção única/múltipla exige >= 2 opções válidas (regra explícita do pedido); outros tipos ignoram options. */
export function validateFormQuestionOptions(
  questionType: string,
  options: string[] | undefined
): { options: string[] } | { error: string } {
  const cleaned = (options ?? []).map((o) => o.trim()).filter(Boolean);
  if (FORM_QUESTION_TYPES_WITH_OPTIONS.includes(questionType as never)) {
    if (cleaned.length < 2) return { error: "Perguntas de seleção exigem pelo menos duas opções válidas." };
    if (cleaned.length > MAX_FORM_QUESTION_OPTIONS) return { error: `Limite de ${MAX_FORM_QUESTION_OPTIONS} opções por pergunta.` };
    if (cleaned.some((o) => o.length > MAX_LIST_ENTRY_LENGTH)) return { error: "Uma das opções está muito longa." };
    return { options: cleaned };
  }
  return { options: [] };
}

function sanitizeStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ENTRIES)
    .map((v) => v.slice(0, MAX_LIST_ENTRY_LENGTH));
}

/**
 * metadata de Reunião — tipado e validado aqui, nunca confiando só no
 * frontend (item 14/19 do pedido). Cada campo é opcional: a etapa de
 * criação exige só o mínimo (ver validate/route.ts pros erros críticos),
 * o resto pode ser preenchido depois.
 */
export function sanitizeMeetingMetadata(input: unknown): { metadata: Record<string, unknown> } | { error: string } {
  if (input === undefined || input === null) return { metadata: {} };
  if (typeof input !== "object") return { error: "Configuração da reunião inválida." };
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (src.objective !== undefined) {
    if (typeof src.objective !== "string") return { error: "Objetivo inválido." };
    out.objective = src.objective.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.meetingType !== undefined) {
    if (typeof src.meetingType !== "string" || !isValidMeetingType(src.meetingType)) return { error: "Tipo de reunião inválido." };
    out.meetingType = src.meetingType;
  }
  if (src.durationValue !== undefined) {
    if (src.durationValue !== null && (typeof src.durationValue !== "number" || src.durationValue < 0)) {
      return { error: "Duração da reunião inválida." };
    }
    out.durationValue = src.durationValue;
  }
  if (src.durationUnit !== undefined) {
    if (typeof src.durationUnit !== "string" || !isValidMeetingDurationUnit(src.durationUnit)) return { error: "Unidade de duração inválida." };
    out.durationUnit = src.durationUnit;
  }
  if (src.format !== undefined) {
    if (typeof src.format !== "string" || !isValidMeetingFormat(src.format)) return { error: "Formato da reunião inválido." };
    out.format = src.format;
  }
  if (src.mainContactRole !== undefined) {
    if (typeof src.mainContactRole !== "string") return { error: "Papel do contato principal inválido." };
    out.mainContactRole = src.mainContactRole.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.internalParticipantRoles !== undefined) out.internalParticipantRoles = sanitizeStringList(src.internalParticipantRoles);
  if (src.clientParticipants !== undefined) out.clientParticipants = sanitizeStringList(src.clientParticipants);
  if (src.prerequisites !== undefined) out.prerequisites = sanitizeStringList(src.prerequisites);
  if (src.requiredDocuments !== undefined) out.requiredDocuments = sanitizeStringList(src.requiredDocuments);
  if (src.materialsToSend !== undefined) out.materialsToSend = sanitizeStringList(src.materialsToSend);
  if (src.agenda !== undefined) out.agenda = sanitizeStringList(src.agenda);
  if (src.keyQuestions !== undefined) out.keyQuestions = sanitizeStringList(src.keyQuestions);
  if (src.participantsRequired !== undefined) out.participantsRequired = Boolean(src.participantsRequired);
  if (src.recordRequired !== undefined) out.recordRequired = Boolean(src.recordRequired);
  if (src.requiresMinutes !== undefined) out.requiresMinutes = Boolean(src.requiresMinutes);
  if (src.expectedDecision !== undefined) {
    if (typeof src.expectedDecision !== "string") return { error: "Decisão esperada inválida." };
    out.expectedDecision = src.expectedDecision.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.associatedDeliverable !== undefined) {
    if (typeof src.associatedDeliverable !== "string") return { error: "Entregável associado inválido." };
    out.associatedDeliverable = src.associatedDeliverable.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.notes !== undefined) {
    if (typeof src.notes !== "string") return { error: "Observações inválidas." };
    out.notes = src.notes.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.rescheduleTolerance !== undefined) {
    if (typeof src.rescheduleTolerance !== "string") return { error: "Tolerância de reagendamento inválida." };
    out.rescheduleTolerance = src.rescheduleTolerance.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }

  return { metadata: out };
}

/** metadata de Documento — mesmo raciocínio de sanitizeMeetingMetadata. */
export function sanitizeDocumentMetadata(input: unknown): { metadata: Record<string, unknown> } | { error: string } {
  if (input === undefined || input === null) return { metadata: {} };
  if (typeof input !== "object") return { error: "Configuração do documento inválida." };
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (src.documentKind !== undefined) {
    if (typeof src.documentKind !== "string" || !isValidDocumentKind(src.documentKind)) return { error: "Tipo de documento inválido." };
    out.documentKind = src.documentKind;
  }
  if (src.origin !== undefined) {
    if (typeof src.origin !== "string" || !isValidDocumentOrigin(src.origin)) return { error: "Origem do documento inválida." };
    out.origin = src.origin;
  }
  if (src.category !== undefined) {
    if (typeof src.category !== "string" || !isValidDocumentCategory(src.category)) return { error: "Categoria do documento inválida." };
    out.category = src.category;
  }
  if (src.visibility !== undefined) {
    if (typeof src.visibility !== "string" || !isValidDocumentVisibility(src.visibility)) return { error: "Visibilidade do documento inválida." };
    out.visibility = src.visibility;
  }
  if (src.templateFileNote !== undefined) {
    if (typeof src.templateFileNote !== "string") return { error: "Nota de arquivo modelo inválida." };
    out.templateFileNote = src.templateFileNote.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.resourceId !== undefined) {
    if (src.resourceId !== null && typeof src.resourceId !== "string") return { error: "Recurso vinculado inválido." };
    out.resourceId = src.resourceId;
  }
  if (src.requiresApproval !== undefined) out.requiresApproval = Boolean(src.requiresApproval);
  if (src.acceptedFormats !== undefined) {
    if (!Array.isArray(src.acceptedFormats)) return { error: "Formatos aceitos inválidos." };
    const formats = src.acceptedFormats.filter((f): f is string => typeof f === "string");
    if (formats.some((f) => !isValidDocumentFormat(f))) return { error: "Um dos formatos aceitos é inválido." };
    out.acceptedFormats = formats;
  }

  return { metadata: out };
}

// "Ação em caso de atraso" do pedido pra Reunião/Checklist/Formulário/
// Documento é o MESMO conjunto de OVERDUE_ACTIONS já usado pelos blocos da
// Fase 2.1 — não precisa de lista nova.

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
