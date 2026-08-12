import { todayInTimeZone, resolveReportDateRange } from "@/lib/reports/period";

function check(label: string, utcInstant: string, expectedLocalDay: string) {
  const result = todayInTimeZone("America/Sao_Paulo", new Date(utcInstant));
  const ok = result === expectedLocalDay;
  console.log(`${ok ? "OK " : "FALHOU"}  ${label}: UTC=${utcInstant} -> local=${result} (esperado ${expectedLocalDay})`);
}

// America/Sao_Paulo = UTC-3, sem horário de verão desde 2019.
check("23:30 local (ainda dia anterior em UTC+1h)", "2026-08-12T23:30:00-03:00", "2026-08-12");
check("00:30 local (já virou o dia, mas UTC ainda é 03:30 do mesmo dia UTC)", "2026-08-13T00:30:00-03:00", "2026-08-13");
check("equivalente em UTC puro: 2026-08-13T02:30:00Z = 2026-08-12 23:30 local", "2026-08-13T02:30:00Z", "2026-08-12");
check("equivalente em UTC puro: 2026-08-13T03:30:00Z = 2026-08-13 00:30 local", "2026-08-13T03:30:00Z", "2026-08-13");

console.log("\n== resolveReportDateRange('today') no instante 2026-08-13T02:30:00Z (23:30 de 12/08 em SP) ==");
const r1 = resolveReportDateRange({
  period: "today",
  timezone: "America/Sao_Paulo",
  earliestAvailable: "2026-04-14",
  now: new Date("2026-08-13T02:30:00Z"),
});
console.log(JSON.stringify(r1));
console.log(r1.since === "2026-08-12" ? "OK — permaneceu no dia local correto (12/08)" : "FALHOU");

console.log("\n== resolveReportDateRange('today') no instante 2026-08-13T03:30:00Z (00:30 de 13/08 em SP) ==");
const r2 = resolveReportDateRange({
  period: "today",
  timezone: "America/Sao_Paulo",
  earliestAvailable: "2026-04-14",
  now: new Date("2026-08-13T03:30:00Z"),
});
console.log(JSON.stringify(r2));
console.log(r2.since === "2026-08-13" ? "OK — virou corretamente pro novo dia local (13/08)" : "FALHOU");

process.exit(0);
