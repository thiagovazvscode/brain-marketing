"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, KeyRound, Ban, CheckCircle2, ExternalLink, Copy, Check } from "lucide-react";

export interface PortalUserRow {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  status: "ativo" | "inativo";
  lastAccessAt: string | Date | null;
}

const ROLE_LABEL: Record<string, string> = {
  proprietario: "Proprietário",
  coordenador: "Coordenador",
  gerente: "Gerente",
};

const inputClass =
  "w-full rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink focus:border-os-accent focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-os-muted";

function formatLastAccess(value: string | Date | null) {
  if (!value) return "Nunca acessou";
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CredentialReveal({ email, password, onDismiss }: { email: string; password: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`E-mail: ${email}\nSenha temporária: ${password}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-os-accent/40 bg-os-accent-soft p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-os-accent">Entregue estas credenciais ao cliente agora</p>
      <p className="mt-1 text-[11px] text-os-muted">Esta senha só é exibida uma vez — não fica salva em nenhum lugar.</p>
      <div className="mt-3 space-y-1 rounded-lg bg-os-bg/60 p-3 font-mono text-sm text-os-ink">
        <p>E-mail: {email}</p>
        <p>Senha: {password}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button onClick={onDismiss} className="rounded-lg border border-os-border px-3 py-1.5 text-xs font-semibold text-os-muted hover:text-os-ink">
          Fechar
        </button>
      </div>
    </div>
  );
}

export function ClientPortalAccessPanel({ clientSlug, users }: { clientSlug: string; users: PortalUserRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("gerente");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const hasActiveUser = users.some((u) => u.status === "ativo");

  async function handleAddUser(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientSlug}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(json?.error || "Não foi possível criar o acesso.");
        return;
      }
      if (json?.temporaryPassword) {
        setReveal({ email: email.trim().toLowerCase(), password: json.temporaryPassword });
      }
      setName("");
      setEmail("");
      setRole("gerente");
      setShowForm(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(userId: string, userEmail: string) {
    setBusyUserId(userId);
    try {
      const response = await fetch(`/api/admin/clients/${clientSlug}/users/${userId}/reset-password`, { method: "POST" });
      const json = await response.json().catch(() => null);
      if (response.ok && json?.temporaryPassword) {
        setReveal({ email: userEmail, password: json.temporaryPassword });
      }
      router.refresh();
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleToggleStatus(userId: string, nextStatus: "ativo" | "inativo") {
    setBusyUserId(userId);
    try {
      await fetch(`/api/admin/clients/${clientSlug}/users/${userId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-os-muted">Status do portal</p>
          <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${hasActiveUser ? "bg-os-accent-soft text-os-accent" : "bg-os-danger-soft text-os-danger"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {hasActiveUser ? "Ativo" : "Inativo"}
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href={`/dashboard/${clientSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-os-border px-3 py-1.5 text-xs font-semibold text-os-ink hover:bg-os-bg"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir dashboard
          </a>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar usuário
          </button>
        </div>
      </div>

      {reveal ? <CredentialReveal email={reveal.email} password={reveal.password} onDismiss={() => setReveal(null)} /> : null}

      {showForm ? (
        <form onSubmit={handleAddUser} className="rounded-xl border border-os-border bg-os-card/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Papel no cliente</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                <option value="proprietario">Proprietário</option>
                <option value="coordenador">Coordenador</option>
                <option value="gerente">Gerente</option>
              </select>
            </div>
          </div>
          {formError ? <p className="mt-2 text-xs text-os-danger">{formError}</p> : null}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Criar acesso
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-os-border px-3 py-1.5 text-xs font-semibold text-os-muted hover:text-os-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-os-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-os-card/60 text-left text-[11px] uppercase tracking-wide text-os-muted">
              <th className="px-4 py-2.5 font-semibold">Nome</th>
              <th className="px-4 py-2.5 font-semibold">E-mail</th>
              <th className="px-4 py-2.5 font-semibold">Papel</th>
              <th className="px-4 py-2.5 font-semibold">Último acesso</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-os-muted">
                  Nenhum usuário com acesso ao portal ainda.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-os-border">
                  <td className="px-4 py-2.5 text-os-ink">{u.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-os-ink">{u.email}</td>
                  <td className="px-4 py-2.5 text-os-muted">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="px-4 py-2.5 text-os-muted">{formatLastAccess(u.lastAccessAt)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.status === "ativo" ? "bg-os-accent-soft text-os-accent" : "bg-os-danger-soft text-os-danger"
                      }`}
                    >
                      {u.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={busyUserId === u.userId}
                        onClick={() => handleResetPassword(u.userId, u.email)}
                        title="Resetar senha"
                        className="rounded-lg border border-os-border p-1.5 text-os-muted transition hover:text-os-ink disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      {u.status === "ativo" ? (
                        <button
                          disabled={busyUserId === u.userId}
                          onClick={() => handleToggleStatus(u.userId, "inativo")}
                          title="Desativar"
                          className="rounded-lg border border-os-border p-1.5 text-os-muted transition hover:text-os-danger disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled={busyUserId === u.userId}
                          onClick={() => handleToggleStatus(u.userId, "ativo")}
                          title="Reativar"
                          className="rounded-lg border border-os-border p-1.5 text-os-muted transition hover:text-os-accent disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
