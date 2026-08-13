import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/layout/Footer";
import { getWhatsappLink } from "@/config/site";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex flex-col items-center gap-4">
            <Logo width={140} height={42} priority />
            <h1 className="text-xl font-bold">Esqueci minha senha</h1>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-left">
            <p className="text-sm leading-relaxed text-zinc-300">
              Por enquanto, a redefinição de senha do portal é feita pelo seu contato na Brain — fale com a gente
              pelo WhatsApp e a gente gera uma senha temporária pra você em minutos.
            </p>
            <a
              href={getWhatsappLink("Olá! Preciso redefinir minha senha do portal Brain.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Falar no WhatsApp
            </a>
          </div>

          <Link href="/login" className="mt-5 inline-block text-xs font-medium text-zinc-400 transition hover:text-white">
            Voltar para o login
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
