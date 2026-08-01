import { contentStatusColor, contentStatusLabel } from "@/lib/methods";

export function StatusBadge({ status }: { status: string }) {
  const color = contentStatusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {contentStatusLabel(status)}
    </span>
  );
}
