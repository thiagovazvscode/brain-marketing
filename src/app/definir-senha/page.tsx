"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/layout/Footer";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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
        body: JSON.stringify({ currentPassword: tempPassword, newPassword }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setError(json?.error || "Não foi possível definir a nova senha.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível definir a nova senha agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Logo width={140} height={42} priority />
            <div>
              <h1 className="text-xl font-bold">Defina sua nova senha</h1>
              <p className="mt-1.5 text-sm text-zinc-400">Este é o seu primeiro acesso — troque a senha temporária antes de continuar.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Senha temporária</label>
            <input
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mb-4 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none"
            />

            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="mb-4 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none"
            />

            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-brand-primary focus:outline-none"
            />

            {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              Definir senha e continuar
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
