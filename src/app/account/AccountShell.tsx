"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/layout/Footer";

export function AccountShell({
  name,
  email,
  companyName,
  backHref,
}: {
  name: string;
  email: string;
  companyName: string | null;
  backHref: string;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setError(json?.error || "Não foi possível alterar a senha.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Não foi possível alterar a senha agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="border-b border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <Link href={backHref} className="flex items-center gap-2">
            <Logo width={104} height={31} />
          </Link>
          <Link href={backHref} className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar à dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-xl font-bold">Minha conta</h1>
        <p className="mt-1 text-sm text-zinc-400">Seus dados e acesso ao portal Brain.</p>

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Nome</dt>
              <dd className="mt-1 text-sm text-white">{name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">E-mail</dt>
              <dd className="mt-1 text-sm text-white">{email}</dd>
            </div>
            {companyName ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Empresa</dt>
                <dd className="mt-1 text-sm text-white">{companyName}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
          <h2 className="text-sm font-semibold">Alterar senha</h2>
          <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
              />
            </div>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            {success ? <p className="text-xs text-emerald-400">Senha alterada com sucesso.</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Salvar nova senha
            </button>
          </form>
        </section>

        <button onClick={handleLogout} className="mt-6 text-sm font-medium text-zinc-400 transition hover:text-white">
          Sair da conta
        </button>
      </main>

      <Footer />
    </div>
  );
}
