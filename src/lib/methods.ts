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
  // Fase 2.2B.1: Análise habilitada; Entregável/Aprovação/Marco continuam
  // "Em breve" mas já entram na categoria "Produção e Validação" (mesma
  // agrupação da referência visual do pedido) — Espera/Condição não fazem
  // parte desse grupo, ficam soltos em "futuro".
  { id: "analysis", label: "Análise", active: true, category: "producao_validacao", description: "Avaliação estruturada de dados, processos, evidências e desempenho.", color: "indigo" },
  // Fase 2.2B.2A: Entregável habilitado. Azul profundo ("navy") é uma
  // identidade nova — não reaproveita "blue" (já usado por Solicitação ao
  // cliente) nem o verde Brain (reservado a seleção/sucesso/ação principal).
  { id: "deliverable", label: "Entregável", active: true, category: "producao_validacao", description: "Resultado oficial da operação, composto por componentes, formatos e critérios de conclusão.", color: "navy" },
  { id: "approval", label: "Aprovação", active: false, category: "producao_validacao", description: "Aprovação formal de uma etapa ou entrega.", color: "slate" },
  { id: "milestone", label: "Marco", active: false, category: "producao_validacao", description: "Marco de referência na linha do tempo do playbook.", color: "slate" },
  { id: "wait", label: "Espera", active: false, category: "futuro", description: "Período de espera antes de seguir para o próximo bloco.", color: "slate" },
  { id: "condition", label: "Condição", active: false, category: "futuro", description: "Ramificação condicional entre blocos.", color: "slate" },
] as const;

export type PlaybookBlockTypeId = (typeof PLAYBOOK_BLOCK_TYPES)[number]["id"];

export const PLAYBOOK_BLOCK_CATEGORIES = [
  { id: "execucao", label: "Execução" },
  { id: "interacao", label: "Interação" },
  { id: "conteudo", label: "Conteúdo e arquivos" },
  { id: "producao_validacao", label: "Produção e Validação" },
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

// ── Fase 2.2B.1 — Análise ────────────────────────────────────────────────
// analysisType é texto validado em app (lista que cresce, mesmo raciocínio
// de meetingType/documentCategory) — ao contrário de evaluationType, que é
// enum do banco (analysis_evaluation_type: 8 valores fixos do pedido).
export const ANALYSIS_TYPES = [
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "auditoria", label: "Auditoria" },
  { id: "comparacao", label: "Comparação" },
  { id: "avaliacao_desempenho", label: "Avaliação de desempenho" },
  { id: "analise_dados", label: "Análise de dados" },
  { id: "analise_qualitativa", label: "Análise qualitativa" },
  { id: "personalizada", label: "Análise personalizada" },
] as const;

// Espelha o enum do banco (analysis_evaluation_type) — só pra label/opções
// no frontend e validação de app; o enum do banco é a garantia real.
export const ANALYSIS_EVALUATION_TYPES = [
  { id: "texto_livre", label: "Texto livre" },
  { id: "sim_nao", label: "Sim ou não" },
  { id: "nota_0_5", label: "Nota de 0 a 5" },
  { id: "nota_0_10", label: "Nota de 0 a 10" },
  { id: "percentual", label: "Percentual" },
  { id: "classificacao", label: "Classificação" },
  { id: "numero", label: "Número" },
  { id: "moeda", label: "Moeda" },
] as const;

export type AnalysisEvaluationTypeId = (typeof ANALYSIS_EVALUATION_TYPES)[number]["id"];
// Só esse tipo tem sublista de opções estruturadas (item 9 do pedido).
export const ANALYSIS_EVALUATION_TYPES_WITH_OPTIONS: AnalysisEvaluationTypeId[] = ["classificacao"];
export const ANALYSIS_CLASSIFICATION_DEFAULT_OPTIONS = ["Crítico", "Abaixo do esperado", "Adequado", "Bom", "Excelente"];

export const ANALYSIS_SOURCE_TYPES = [
  { id: "meeting", label: "Reunião" },
  { id: "checklist", label: "Checklist" },
  { id: "form_briefing", label: "Formulário/Briefing" },
  { id: "document", label: "Documento" },
  { id: "internal_task", label: "Tarefa interna" },
  { id: "client_request", label: "Solicitação ao cliente" },
  { id: "resource", label: "Recurso da biblioteca" },
  { id: "personalizada", label: "Fonte personalizada" },
] as const;

// Limites defensivos (item 21 do pedido) — nunca confiar só no frontend.
export const MAX_ANALYSIS_DIMENSIONS_PER_BLOCK = 30;
export const MAX_ANALYSIS_CRITERIA_PER_DIMENSION = 100;
export const MAX_ANALYSIS_CLASSIFICATION_OPTIONS = 50;
export const MAX_ANALYSIS_SOURCES = 50;

export const analysisTypeLabel = (id: string | null) => labelOf(ANALYSIS_TYPES, id);
export const analysisEvaluationTypeLabel = (id: string | null) => labelOf(ANALYSIS_EVALUATION_TYPES, id);
export const analysisSourceTypeLabel = (id: string | null) => labelOf(ANALYSIS_SOURCE_TYPES, id);

export const isValidAnalysisType = (id: string) => ANALYSIS_TYPES.some((s) => s.id === id);
export const isValidAnalysisEvaluationType = (id: string): id is AnalysisEvaluationTypeId =>
  ANALYSIS_EVALUATION_TYPES.some((s) => s.id === id);
export const isValidAnalysisSourceType = (id: string) => ANALYSIS_SOURCE_TYPES.some((s) => s.id === id);

/** metadata de Análise — tipagem/metodologia/fontes/conclusões, mesmo raciocínio de sanitizeMeetingMetadata/sanitizeDocumentMetadata. */
export function sanitizeAnalysisMetadata(input: unknown): { metadata: Record<string, unknown> } | { error: string } {
  if (input === undefined || input === null) return { metadata: {} };
  if (typeof input !== "object") return { error: "Configuração da análise inválida." };
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (src.analysisType !== undefined) {
    if (typeof src.analysisType !== "string" || !isValidAnalysisType(src.analysisType)) return { error: "Tipo de análise inválido." };
    out.analysisType = src.analysisType;
  }
  if (src.objective !== undefined) {
    if (typeof src.objective !== "string") return { error: "Objetivo inválido." };
    out.objective = src.objective.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.method !== undefined) {
    if (typeof src.method !== "string") return { error: "Método utilizado inválido." };
    out.method = src.method.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.analyzedPeriod !== undefined) {
    if (typeof src.analyzedPeriod !== "string") return { error: "Período analisado inválido." };
    out.analyzedPeriod = src.analyzedPeriod.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.requiresEvidence !== undefined) out.requiresEvidence = Boolean(src.requiresEvidence);
  if (src.useWeights !== undefined) out.useWeights = Boolean(src.useWeights);
  if (src.scoringSystem !== undefined) {
    if (typeof src.scoringSystem !== "string") return { error: "Sistema de pontuação inválido." };
    out.scoringSystem = src.scoringSystem.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.methodologyNotes !== undefined) {
    if (typeof src.methodologyNotes !== "string") return { error: "Observações metodológicas inválidas." };
    out.methodologyNotes = src.methodologyNotes.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.collaborators !== undefined) out.collaborators = sanitizeStringList(src.collaborators);
  if (src.sources !== undefined) {
    if (!Array.isArray(src.sources)) return { error: "Fontes de informação inválidas." };
    if (src.sources.length > MAX_ANALYSIS_SOURCES) return { error: `Limite de ${MAX_ANALYSIS_SOURCES} fontes por análise.` };
    const sources: Record<string, unknown>[] = [];
    for (const raw of src.sources) {
      if (!raw || typeof raw !== "object") return { error: "Uma das fontes de informação é inválida." };
      const s = raw as Record<string, unknown>;
      if (typeof s.type !== "string" || !isValidAnalysisSourceType(s.type)) return { error: "Tipo de fonte inválido." };
      if (typeof s.label !== "string" || !s.label.trim()) return { error: "Toda fonte precisa de um nome." };
      sources.push({
        type: s.type,
        sourceBlockId: typeof s.sourceBlockId === "string" ? s.sourceBlockId : null,
        resourceId: typeof s.resourceId === "string" ? s.resourceId : null,
        label: s.label.trim().slice(0, MAX_SHORT_TEXT_LENGTH),
        required: Boolean(s.required),
        purpose: typeof s.purpose === "string" ? s.purpose.trim().slice(0, MAX_LONG_TEXT_LENGTH) : "",
      });
    }
    out.sources = sources;
  }
  if (src.synthesisRequired !== undefined) out.synthesisRequired = Boolean(src.synthesisRequired);
  if (src.recommendationsRequired !== undefined) out.recommendationsRequired = Boolean(src.recommendationsRequired);
  if (src.mainProblems !== undefined) out.mainProblems = sanitizeStringList(src.mainProblems);
  if (src.strengths !== undefined) out.strengths = sanitizeStringList(src.strengths);
  if (src.risks !== undefined) out.risks = sanitizeStringList(src.risks);
  if (src.opportunities !== undefined) out.opportunities = sanitizeStringList(src.opportunities);
  if (src.recommendations !== undefined) out.recommendations = sanitizeStringList(src.recommendations);
  if (src.priorities !== undefined) out.priorities = sanitizeStringList(src.priorities);
  if (src.attachedEvidence !== undefined) out.attachedEvidence = sanitizeStringList(src.attachedEvidence);
  if (src.relatedDeliverable !== undefined) {
    if (typeof src.relatedDeliverable !== "string") return { error: "Entregável relacionado inválido." };
    out.relatedDeliverable = src.relatedDeliverable.trim().slice(0, MAX_SHORT_TEXT_LENGTH);
  }
  if (src.finalNotes !== undefined) {
    if (typeof src.finalNotes !== "string") return { error: "Observações finais inválidas." };
    out.finalNotes = src.finalNotes.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.allowPartialAnalysis !== undefined) out.allowPartialAnalysis = Boolean(src.allowPartialAnalysis);
  if (src.requiresInternalReview !== undefined) out.requiresInternalReview = Boolean(src.requiresInternalReview);

  return { metadata: out };
}

/** 0-100 ou null — mesma regra pra peso de dimensão e de critério (CHECK do banco é o backstop, isto valida antes de chegar lá). */
export function validateAnalysisWeight(weight: unknown): { weight: number | null } | { error: string } {
  if (weight === null || weight === undefined) return { weight: null };
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > 100) {
    return { error: "Peso deve ser um número entre 0 e 100." };
  }
  return { weight: Math.round(weight) };
}

/** Classificação exige >= 2 opções válidas, sem duplicadas após normalizar (item 5/9 do pedido); outros tipos ignoram options. */
export function validateAnalysisCriterionOptions(
  evaluationType: string,
  options: string[] | undefined
): { options: string[] } | { error: string } {
  const cleaned = (options ?? []).map((o) => o.trim()).filter(Boolean);
  if (ANALYSIS_EVALUATION_TYPES_WITH_OPTIONS.includes(evaluationType as AnalysisEvaluationTypeId)) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const opt of cleaned) {
      const key = opt.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(opt);
    }
    if (deduped.length < 2) return { error: "Classificação exige pelo menos duas opções válidas." };
    if (deduped.length > MAX_ANALYSIS_CLASSIFICATION_OPTIONS) return { error: `Limite de ${MAX_ANALYSIS_CLASSIFICATION_OPTIONS} opções por critério.` };
    if (deduped.some((o) => o.length > MAX_LIST_ENTRY_LENGTH)) return { error: "Uma das opções está muito longa." };
    return { options: deduped };
  }
  return { options: [] };
}

/**
 * Regra única de "a análise exige evidência" — usada tanto na validação
 * quanto na pré-visualização, pra nunca divergir entre as duas. Verdadeiro
 * quando o toggle global de evidência está ativo OU quando ao menos um
 * critério ativo, de uma dimensão ativa, tem requiresEvidence = true.
 */
export function analysisRequiresEvidence(
  metaRequiresEvidence: unknown,
  dimensions: { isActive: boolean; criteria: { isActive: boolean; requiresEvidence: boolean }[] }[]
): boolean {
  if (metaRequiresEvidence) return true;
  return dimensions.some((d) => d.isActive && d.criteria.some((c) => c.isActive && c.requiresEvidence));
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

// ── Fase 2.2B.2A — Entregável ────────────────────────────────────────────
// deliverableType/primaryFormat/additionalFormats vivem em
// playbook_block_templates.metadata (mesmo raciocínio de analysisType/
// documentKind — texto validado em app, lista que tende a crescer, sem
// tabela/coluna própria). componentType/expectedFormat, por outro lado, são
// colunas reais de playbook_deliverable_components e por isso são enum do
// banco (deliverable_component_type/deliverable_component_format,
// aplicados na Fase 2.2B.2A) — as listas abaixo espelham exatamente esses
// dois enums, mesmo padrão de ANALYSIS_EVALUATION_TYPES espelhando
// analysis_evaluation_type.
export const DELIVERABLE_TYPES = [
  { id: "plano_de_acao", label: "Plano de ação" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "relatorio", label: "Relatório" },
  { id: "apresentacao", label: "Apresentação" },
  { id: "estrategia", label: "Estratégia" },
  { id: "campanha", label: "Campanha" },
  { id: "pagina", label: "Página" },
  { id: "video", label: "Vídeo" },
  { id: "dashboard", label: "Dashboard" },
  { id: "sistema", label: "Sistema" },
  { id: "personalizado", label: "Entregável personalizado" },
] as const;

export const DELIVERABLE_FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "apresentacao", label: "Apresentação" },
  { id: "documento", label: "Documento" },
  { id: "planilha", label: "Planilha" },
  { id: "dashboard", label: "Dashboard" },
  { id: "pagina", label: "Página" },
  { id: "video", label: "Vídeo" },
  { id: "arquivo_digital", label: "Arquivo digital" },
  { id: "sistema", label: "Sistema" },
  { id: "multiplos_formatos", label: "Múltiplos formatos" },
  { id: "outro", label: "Outro" },
] as const;

// Espelha o enum do banco deliverable_component_type (10 valores fixos da
// migration da Fase 2.2B.2A) — só pra label/opções no frontend e validação
// de app; o enum do banco (NOT NULL, sem default) é a garantia real.
export const DELIVERABLE_COMPONENT_TYPES = [
  { id: "section", label: "Seção" },
  { id: "document", label: "Documento" },
  { id: "presentation", label: "Apresentação" },
  { id: "spreadsheet", label: "Planilha" },
  { id: "dashboard", label: "Dashboard" },
  { id: "page", label: "Página" },
  { id: "video", label: "Vídeo" },
  { id: "file", label: "Arquivo" },
  { id: "system", label: "Sistema" },
  { id: "other", label: "Outro" },
] as const;

export type DeliverableComponentTypeId = (typeof DELIVERABLE_COMPONENT_TYPES)[number]["id"];

// Espelha deliverable_component_format (11 valores fixos).
export const DELIVERABLE_COMPONENT_FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "presentation", label: "Apresentação" },
  { id: "document", label: "Documento" },
  { id: "spreadsheet", label: "Planilha" },
  { id: "dashboard", label: "Dashboard" },
  { id: "page", label: "Página" },
  { id: "video", label: "Vídeo" },
  { id: "digital_file", label: "Arquivo digital" },
  { id: "system", label: "Sistema" },
  { id: "multiple", label: "Múltiplos formatos" },
  { id: "other", label: "Outro" },
] as const;

export type DeliverableComponentFormatId = (typeof DELIVERABLE_COMPONENT_FORMATS)[number]["id"];

// Limite defensivo (item 8/24 do pedido da Fase 2.2B.2A) — nunca confiar só no frontend.
export const MAX_DELIVERABLE_COMPONENTS_PER_BLOCK = 50;

export const deliverableTypeLabel = (id: string | null) => labelOf(DELIVERABLE_TYPES, id);
export const deliverableFormatLabel = (id: string | null) => labelOf(DELIVERABLE_FORMATS, id);
export const deliverableComponentTypeLabel = (id: string | null) => labelOf(DELIVERABLE_COMPONENT_TYPES, id);
export const deliverableComponentFormatLabel = (id: string | null) => labelOf(DELIVERABLE_COMPONENT_FORMATS, id);

export const isValidDeliverableType = (id: string) => DELIVERABLE_TYPES.some((s) => s.id === id);
export const isValidDeliverableFormat = (id: string) => DELIVERABLE_FORMATS.some((s) => s.id === id);
export const isValidDeliverableComponentType = (id: string): id is DeliverableComponentTypeId =>
  DELIVERABLE_COMPONENT_TYPES.some((s) => s.id === id);
export const isValidDeliverableComponentFormat = (id: string): id is DeliverableComponentFormatId =>
  DELIVERABLE_COMPONENT_FORMATS.some((s) => s.id === id);

/** metadata de Entregável — mesmo raciocínio de sanitizeAnalysisMetadata/sanitizeMeetingMetadata. */
export function sanitizeDeliverableMetadata(input: unknown): { metadata: Record<string, unknown> } | { error: string } {
  if (input === undefined || input === null) return { metadata: {} };
  if (typeof input !== "object") return { error: "Configuração do entregável inválida." };
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (src.deliverableType !== undefined) {
    if (typeof src.deliverableType !== "string" || !isValidDeliverableType(src.deliverableType)) return { error: "Tipo de entregável inválido." };
    out.deliverableType = src.deliverableType;
  }
  if (src.primaryFormat !== undefined) {
    if (typeof src.primaryFormat !== "string" || !isValidDeliverableFormat(src.primaryFormat)) return { error: "Formato principal inválido." };
    out.primaryFormat = src.primaryFormat;
  }
  if (src.additionalFormats !== undefined) {
    if (!Array.isArray(src.additionalFormats)) return { error: "Formatos adicionais inválidos." };
    const formats = src.additionalFormats.filter((f): f is string => typeof f === "string");
    if (formats.some((f) => !isValidDeliverableFormat(f))) return { error: "Um dos formatos adicionais é inválido." };
    out.additionalFormats = formats;
  }
  if (src.objective !== undefined) {
    if (typeof src.objective !== "string") return { error: "Objetivo inválido." };
    out.objective = src.objective.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.requiresInternalReview !== undefined) out.requiresInternalReview = Boolean(src.requiresInternalReview);
  if (src.allowsPartialDelivery !== undefined) out.allowsPartialDelivery = Boolean(src.allowsPartialDelivery);
  if (src.productionNotes !== undefined) {
    if (typeof src.productionNotes !== "string") return { error: "Observações de produção inválidas." };
    out.productionNotes = src.productionNotes.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  if (src.formatGuidance !== undefined) {
    if (typeof src.formatGuidance !== "string") return { error: "Orientação de formato inválida." };
    out.formatGuidance = src.formatGuidance.trim().slice(0, MAX_LONG_TEXT_LENGTH);
  }
  // Complementares ao overdueAction genérico do bloco (que já cobre
  // "notificar responsável"/"marcar em risco" como 2 de suas 4 opções
  // mutuamente exclusivas) — pedido explícito da Fase 2.2B.2A pede os dois
  // como toggles independentes específicos do Entregável, não como
  // substituto do seletor genérico.
  if (src.notifyAssigneeOnDelay !== undefined) out.notifyAssigneeOnDelay = Boolean(src.notifyAssigneeOnDelay);
  if (src.markStageAtRiskOnDelay !== undefined) out.markStageAtRiskOnDelay = Boolean(src.markStageAtRiskOnDelay);

  return { metadata: out };
}

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
