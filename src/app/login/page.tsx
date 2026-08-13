"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/layout/Footer";

const ERROR_MESSAGES: Record<string, string> = {
  "sem-acesso": "Sua conta ainda não tem nenhum portal vinculado. Fale com a Brain para liberar seu acesso.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("erro");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(urlError ? (ERROR_MESSAGES[urlError] ?? "") : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setError("E-mail ou senha incorretos.");
        return;
      }

      router.push(json?.passwordChangeRequired ? "/definir-senha" : "/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível autenticar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">E-mail</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        className="mb-4 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-primary focus:outline-none"
      />

      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Senha</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-primary focus:outline-none"
      />

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 accent-brand-primary"
          />
          Lembrar de mim
        </label>
        <Link href="/login/esqueci-senha" className="text-xs font-medium text-zinc-400 transition hover:text-white">
          Esqueci minha senha
        </Link>
      </div>

      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
        Entrar
      </button>
    </form>
  );
}

export default function ClientLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Logo width={140} height={42} priority />
            <div>
              <h1 className="text-xl font-bold">Acesse seu painel</h1>
              <p className="mt-1.5 text-sm text-zinc-400">
                Acompanhe o desempenho das suas campanhas e os resultados da sua operação.
              </p>
            </div>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
