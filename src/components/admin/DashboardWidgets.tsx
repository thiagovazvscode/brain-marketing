import type { ComponentType } from "react";

export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-elevated/50 p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/15 text-brand-magenta">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-black tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

export function HorizontalBarList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-2xl border border-line bg-elevated/50 p-5">
      <h3 className="mb-4 text-sm font-bold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted">Sem dados ainda.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-muted">{item.label}</span>
                <span className="shrink-0 font-bold tabular-nums text-ink">{item.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
                <div className="h-full rounded-full bg-brand-primary" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
