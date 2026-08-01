"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("E-mail ou senha incorretos.");
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Não foi possível autenticar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-os-bg px-4 text-os-ink">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/images/logo.png" alt="Brain Marketing" width={56} height={56} className="rounded-2xl" />
          <div>
            <h1 className="text-lg font-black">Painel Admin</h1>
            <p className="text-xs text-os-muted">Brain Marketing & Performance</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-os-border bg-os-card/50 p-6"
        >
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="mb-4 w-full rounded-lg border border-os-border bg-os-bg/60 px-4 py-2.5 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none"
          />

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-os-muted">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mb-2 w-full rounded-lg border border-os-border bg-os-bg/60 px-4 py-2.5 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none"
          />

          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
