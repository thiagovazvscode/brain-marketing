export type Period = "hoje" | "7d" | "30d";

export function getPeriodStart(period: string): Date {
  const now = new Date();

  if (period === "hoje") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}
