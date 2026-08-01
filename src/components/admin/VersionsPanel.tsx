import { StatusBadge } from "@/components/admin/StatusBadge";
import type { VersionLogRow } from "@/types/methods";

// Compartilhado entre método e playbook — o log de versão tem a mesma forma
// nos dois (versionLabel, status, snapshot, changeNote, autor, data), então um
// componente só evita duas cópias quase idênticas.
export function VersionsPanel({
  versions,
  currentVersion,
  currentStatus,
}: {
  versions: VersionLogRow[];
  currentVersion: string;
  currentStatus: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl border border-os-accent/30 bg-os-accent/5 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-os-ink">v{currentVersion} · versão corrente</p>
          <p className="text-xs text-os-muted">Estado editável agora.</p>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      {versions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
          Nenhuma versão publicada ou arquivada ainda.
        </p>
      ) : (
        versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl border border-os-border bg-os-card px-4 py-3">
            <div>
              <p className="text-sm font-bold text-os-ink">v{v.versionLabel}</p>
              <p className="text-xs text-os-muted">
                {new Date(v.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                {v.changeNote ? ` · ${v.changeNote}` : ""}
              </p>
            </div>
            <StatusBadge status={v.status} />
          </div>
        ))
      )}
    </div>
  );
}
