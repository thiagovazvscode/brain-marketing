"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";

type Status = "idle" | "submitting" | "success";

export function LeadCaptureModal({
  service,
  whatsappHref,
  onClose,
}: {
  service: string;
  whatsappHref: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) nextErrors.name = "Informe seu nome.";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) nextErrors.phone = "Informe um telefone válido com DDD.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    // TODO: substituir por POST /api/leads quando o backend estiver conectado.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatus("success");
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-[#0d1017] shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-magenta">{service}</p>
            <p className="text-sm font-semibold text-ink">
              {status === "success" ? "Recebemos seu contato!" : "Quase lá — deixe seus dados"}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          {status !== "success" ? (
            <form onSubmit={handleSubmit} noValidate>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Nome
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mb-1 w-full rounded-lg border border-line bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand-primary focus:outline-none"
              />
              {errors.name && <p className="mb-2 text-xs text-red-400">{errors.name}</p>}

              <label className="mb-1.5 mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
                Telefone / WhatsApp
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                className="mb-1 w-full rounded-lg border border-line bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand-primary focus:outline-none"
              />
              {errors.phone && <p className="mb-2 text-xs text-red-400">{errors.phone}</p>}

              <label className="mb-1.5 mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
                E-mail <span className="normal-case text-muted/60">(opcional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-line bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand-primary focus:outline-none"
              />

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-600 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="mb-5 text-sm leading-relaxed text-muted">
                Obrigado, {name.split(" ")[0]}! Agora é só falar direto com a gente no WhatsApp
                para tirar dúvidas sobre <strong className="text-ink">{service}</strong>.
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-black text-[#052e14] shadow-lg transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp para tirar dúvidas
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
