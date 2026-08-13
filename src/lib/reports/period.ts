export type PeriodPreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_15d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "since_start"
  | "custom";

export type PeriodInput = { preset: PeriodPreset; from?: string; to?: string };

export type ResolvedPeriod = {
  since: string;
  until: string;
  comparisonSince: string | null;
  comparisonUntil: string | null;
  clampedToEarliest: boolean;
  earliestAvailable: string;
  timezone: string;
};

/**
 * "Hoje" no timezone da CONTA DE ANÚNCIOS — nunca UTC, nunca o timezone do
 * servidor/Vercel/browser. Usa Intl.DateTimeFormat (ICU embutido no Node,
 * sem dependência nova) pra resolver a data de parede corretamente em
 * qualquer timezone IANA, DST incluído onde aplicável. `reference` existe só
 * pra permitir testar a virada do dia com um instante fixo — em produção
 * sempre é `new Date()` (o valor default).
 */
export function todayInTimeZone(timeZone: string, reference: Date = new Date()): string {
  // locale en-CA formata como YYYY-MM-DD diretamente, sem precisar remontar partes.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(reference);
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(since: string, until: string) {
  const a = new Date(since + "T00:00:00Z").getTime();
  const b = new Date(until + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000) + 1;
}

// Componentes Y/M/D de uma data-string (YYYY-MM-DD) já resolvida no
// timezone certo — usado só pra montar "este mês"/"mês anterior" sem
// reintroduzir UTC/servidor no cálculo.
function partsOf(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

function firstDayOfMonth(year: number, month1to12: number) {
  return `${year}-${String(month1to12).padStart(2, "0")}-01`;
}

function lastDayOfPreviousMonth(year: number, month1to12: number) {
  // dia 0 do mês corrente = último dia do mês anterior (aritmética de Date em UTC, sem timezone envolvido pq é só contagem de dias)
  const d = new Date(Date.UTC(year, month1to12 - 1, 0));
  return d.toISOString().slice(0, 10);
}

/**
 * Função central única de resolução de período — nenhum componente/rota
 * deve recalcular datas por conta própria. Todos os presets são ancorados no
 * "hoje" da CONTA DE ANÚNCIOS (timezone), nunca em UTC ou no timezone do
 * processo Node.
 */
export function resolveReportDateRange(options: {
  period: PeriodPreset;
  from?: string;
  to?: string;
  timezone: string;
  earliestAvailable: string;
  now?: Date; // só pra teste de virada de dia — produção usa o default (new Date())
}): ResolvedPeriod {
  const { period, from, to, timezone, earliestAvailable, now = new Date() } = options;
  const todayStr = todayInTimeZone(timezone, now);
  const todayParts = partsOf(todayStr);

  let since: string;
  let until: string;

  switch (period) {
    case "today":
      since = until = todayStr;
      break;
    case "yesterday":
      since = until = addDays(todayStr, -1);
      break;
    case "last_7d":
      // Mesma convenção do date_preset=last_7d do próprio Meta: termina
      // ONTEM, não hoje (confirmado empiricamente — ver nota de auditoria de
      // timezone). "Hoje" é dia ainda em andamento; incluí-lo faz o total
      // divergir do que o Ads Manager mostra pro mesmo preset.
      until = addDays(todayStr, -1);
      since = addDays(until, -6);
      break;
    case "last_14d":
      until = addDays(todayStr, -1);
      since = addDays(until, -13);
      break;
    case "last_15d":
      // Só usado pelo modal de exportação de leads (item 1 do pedido) — o
      // filtro principal do dashboard continua com last_14d, nunca alterado.
      until = addDays(todayStr, -1);
      since = addDays(until, -14);
      break;
    case "last_30d":
      until = addDays(todayStr, -1);
      since = addDays(until, -29);
      break;
    case "this_month":
      since = firstDayOfMonth(todayParts.year, todayParts.month);
      until = todayStr;
      break;
    case "last_month": {
      const lastDayPrev = lastDayOfPreviousMonth(todayParts.year, todayParts.month);
      const prevParts = partsOf(lastDayPrev);
      since = firstDayOfMonth(prevParts.year, prevParts.month);
      until = lastDayPrev;
      break;
    }
    case "since_start":
      since = earliestAvailable;
      until = todayStr;
      break;
    case "custom":
      if (!from || !to) throw new Error("Período personalizado exige from e to.");
      if (from > to) throw new Error("Data final não pode ser anterior à data inicial.");
      since = from;
      until = to;
      break;
    default:
      throw new Error(`Período inválido: ${period}`);
  }

  const clampedToEarliest = since < earliestAvailable;
  if (clampedToEarliest) since = earliestAvailable;
  if (since > until) since = until;

  let comparisonSince: string | null = null;
  let comparisonUntil: string | null = null;
  if (period !== "since_start") {
    const length = daysBetween(since, until);
    const compUntil = addDays(since, -1);
    const compSince = addDays(compUntil, -(length - 1));
    if (compUntil >= earliestAvailable) {
      comparisonUntil = compUntil;
      comparisonSince = compSince < earliestAvailable ? earliestAvailable : compSince;
    }
  }

  return { since, until, comparisonSince, comparisonUntil, clampedToEarliest, earliestAvailable, timezone };
}
