"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { Button } from "@/components/ui/Button";
import type { ContactFormData, FormStatus } from "@/types";
import { siteConfig, getWhatsappLink, defaultWhatsappMessage } from "@/config/site";

const initialForm: ContactFormData = {
  name: "",
  company: "",
  segment: "",
  whatsapp: "",
  email: "",
  service: "",
  investment: "",
  message: "",
};

const serviceOptions: { value: ContactFormData["service"]; label: string }[] = [
  { value: "trafego-pago", label: "Tráfego pago" },
  { value: "posicionamento", label: "Posicionamento" },
  { value: "landing-page-site", label: "Landing page ou site" },
  { value: "audiovisual", label: "Audiovisual" },
  { value: "consultoria", label: "Consultoria" },
  { value: "mercado-imobiliario", label: "Mercado imobiliário" },
  { value: "broker-apps", label: "Broker Apps" },
  { value: "outro", label: "Outro" },
];

const investmentOptions: { value: ContactFormData["investment"]; label: string }[] = [
  { value: "ate-2000", label: "Até R$ 2.000" },
  { value: "2000-5000", label: "De R$ 2.000 a R$ 5.000" },
  { value: "5000-10000", label: "De R$ 5.000 a R$ 10.000" },
  { value: "acima-10000", label: "Acima de R$ 10.000" },
  { value: "nao-definido", label: "Ainda não definido" },
];

type FormErrors = Partial<Record<keyof ContactFormData, string>>;

function validate(data: ContactFormData): FormErrors {
  const errors: FormErrors = {};

  if (data.name.trim().length < 2) {
    errors.name = "Informe seu nome completo.";
  }
  if (data.company.trim().length < 2) {
    errors.company = "Informe o nome da empresa ou negócio.";
  }
  const digits = data.whatsapp.replace(/\D/g, "");
  if (digits.length < 10) {
    errors.whatsapp = "Informe um WhatsApp válido com DDD.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (!data.service) {
    errors.service = "Selecione o serviço de interesse.";
  }

  return errors;
}

const inputClasses =
  "w-full rounded-lg border border-line bg-elevated/60 px-4 py-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-brand-primary focus:outline-none";

const labelClasses = "mb-2 block text-xs font-medium uppercase tracking-wide text-muted";

export function Contact() {
  const [form, setForm] = useState<ContactFormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  function updateField<K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("submitting");

    try {
      // ------------------------------------------------------------------
      // INTEGRAÇÃO: este projeto não possui backend.
      // Substitua a simulação abaixo pelo envio real dos dados do formulário,
      // por exemplo:
      //   - fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })
      //     usando uma Route Handler própria (src/app/api/contact/route.ts);
      //   - um webhook (Zapier, Make, n8n);
      //   - Supabase (supabase.from("leads").insert(form));
      //   - Formspree ou serviço similar de formulário como serviço;
      //   - envio de e-mail transacional (Resend, SendGrid, Nodemailer);
      //   - redirecionamento complementar para o WhatsApp com os dados.
      // ------------------------------------------------------------------
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));

      setStatus("success");
      setForm(initialForm);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section id="contato" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-2xl px-6 text-center lg:px-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center rounded-2xl border border-line bg-elevated/50 px-8 py-16"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-primary/50 text-brand-primary">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h3 className="font-display mt-6 text-2xl font-medium text-ink">
              Solicitação recebida.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Recebemos suas informações. Nossa equipe vai analisar o
              contexto e retornar em breve pelo WhatsApp ou e-mail informado.
            </p>
            <Button
              variant="secondary"
              className="mt-8"
              onClick={() => setStatus("idle")}
            >
              Enviar outra solicitação
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="contato" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              eyebrow="Contato"
              title="Solicite um diagnóstico da sua operação."
              description="Conte um pouco sobre sua empresa e o momento atual. A partir disso, avaliamos o cenário e retornamos com os próximos passos."
            />

            <MotionReveal delay={0.15}>
              <div className="mt-10 space-y-4">
                <a
                  href={getWhatsappLink(defaultWhatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 px-5 py-4 text-sm text-ink/85 transition-colors hover:border-brand-primary/60"
                >
                  <MessageCircle className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                  Falar direto no WhatsApp
                </a>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 px-5 py-4 text-sm text-ink/85 transition-colors hover:border-brand-magenta/60"
                >
                  <Mail className="h-5 w-5 text-brand-magenta" aria-hidden="true" />
                  {siteConfig.email}
                </a>
              </div>
            </MotionReveal>
          </div>

          <MotionReveal delay={0.1}>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl border border-line bg-elevated/30 p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    Nome
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={inputClasses}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1.5 text-xs text-red-400">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className={labelClasses}>
                    Empresa
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    className={inputClasses}
                    aria-invalid={Boolean(errors.company)}
                    aria-describedby={errors.company ? "company-error" : undefined}
                  />
                  {errors.company && (
                    <p id="company-error" className="mt-1.5 text-xs text-red-400">
                      {errors.company}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="segment" className={labelClasses}>
                    Segmento
                  </label>
                  <input
                    id="segment"
                    name="segment"
                    type="text"
                    placeholder="Ex: imobiliária, varejo, serviços"
                    value={form.segment}
                    onChange={(e) => updateField("segment", e.target.value)}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className={labelClasses}>
                    WhatsApp
                  </label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={form.whatsapp}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                    className={inputClasses}
                    aria-invalid={Boolean(errors.whatsapp)}
                    aria-describedby={errors.whatsapp ? "whatsapp-error" : undefined}
                  />
                  {errors.whatsapp && (
                    <p id="whatsapp-error" className="mt-1.5 text-xs text-red-400">
                      {errors.whatsapp}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="email" className={labelClasses}>
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClasses}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1.5 text-xs text-red-400">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="service" className={labelClasses}>
                    Serviço de interesse
                  </label>
                  <select
                    id="service"
                    name="service"
                    value={form.service}
                    onChange={(e) =>
                      updateField("service", e.target.value as ContactFormData["service"])
                    }
                    className={inputClasses}
                    aria-invalid={Boolean(errors.service)}
                    aria-describedby={errors.service ? "service-error" : undefined}
                  >
                    <option value="">Selecione uma opção</option>
                    {serviceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.service && (
                    <p id="service-error" className="mt-1.5 text-xs text-red-400">
                      {errors.service}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="investment" className={labelClasses}>
                    Faixa de investimento
                  </label>
                  <select
                    id="investment"
                    name="investment"
                    value={form.investment}
                    onChange={(e) =>
                      updateField("investment", e.target.value as ContactFormData["investment"])
                    }
                    className={inputClasses}
                  >
                    <option value="">Selecione uma opção</option>
                    {investmentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="message" className={labelClasses}>
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Conte um pouco sobre o momento atual da sua empresa."
                    value={form.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    className={`${inputClasses} resize-none`}
                  />
                </div>
              </div>

              {status === "error" && (
                <p className="mt-5 text-sm text-red-400" role="alert">
                  Não foi possível enviar sua solicitação agora. Tente novamente ou fale pelo WhatsApp.
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-8 w-full sm:w-auto"
                disabled={status === "submitting"}
                icon={status === "submitting" ? undefined : Send}
              >
                {status === "submitting" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Enviando...
                  </span>
                ) : (
                  "Solicitar diagnóstico"
                )}
              </Button>
            </form>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
