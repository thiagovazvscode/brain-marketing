"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Compass,
  Target,
  Rocket,
  Headset,
  BadgeCheck,
  TrendingUp,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";

const journey = [
  { label: "Estratégia", icon: Compass },
  { label: "Posicionamento", icon: Target },
  { label: "Aquisição", icon: Rocket },
  { label: "Atendimento", icon: Headset },
  { label: "Conversão", icon: BadgeCheck },
  { label: "Crescimento", icon: TrendingUp },
];

export function About() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Sobre a Brain"
          title="Marketing isolado não sustenta crescimento. Estrutura sim."
          description="A Brain não entrega campanhas soltas ou peças avulsas. Conectamos estratégia, criatividade, aquisição e atendimento em uma jornada única — da primeira impressão até a venda fechada."
        />

        <div className="mt-20 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FounderPhoto />

          <MotionReveal delay={0.1} className="order-last lg:order-first">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-magenta/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta">
              Quem lidera
            </span>
            <h3 className="font-display mt-5 text-2xl font-medium text-ink md:text-3xl">
              Thiago Vaz
            </h3>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.12em] text-brand-primary">
              Fundador &amp; Estrategista
            </p>
            <p className="mt-5 max-w-lg text-balance leading-relaxed text-muted">
              Depois de anos à frente de operações de aquisição no mercado
              imobiliário, fundei a Brain para resolver um problema recorrente:
              agências que entregam campanhas soltas, sem estrutura por trás.
            </p>
            <p className="mt-4 max-w-lg text-balance leading-relaxed text-muted">
              Acredito em marketing como sistema — estratégia, tecnologia e
              atendimento conectados ao resultado comercial, não a métricas
              isoladas de vaidade.
            </p>
          </MotionReveal>
        </div>

        <div className="mt-24">
          <div className="hidden lg:block">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 right-0 top-7 h-px bg-line" />
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "left" }}
                className="absolute left-0 right-0 top-7 h-px bg-gradient-to-r from-brand-primary via-brand-pink to-brand-magenta"
              />

              {journey.map((step, index) => (
                <MotionReveal key={step.label} delay={index * 0.08} direction="none" className="relative z-10 flex flex-col items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg text-brand-primary shadow-[0_0_0_6px_var(--color-bg)]">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-ink/85">{step.label}</span>
                </MotionReveal>
              ))}
            </div>
          </div>

          <ol className="flex flex-col gap-0 lg:hidden">
            {journey.map((step, index) => (
              <MotionReveal key={step.label} delay={index * 0.06}>
                <li className="relative flex items-center gap-4 py-4">
                  {index !== journey.length - 1 && (
                    <span className="absolute left-6 top-14 h-full w-px bg-line" aria-hidden="true" />
                  )}
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-bg text-brand-primary">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-base font-medium text-ink/85">{step.label}</span>
                </li>
              </MotionReveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function FounderPhoto() {
  return (
    <MotionReveal className="order-first lg:order-last">
      <div
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl sm:max-w-md"
        style={{ height: "480px", boxShadow: "0 0 80px rgba(37, 99, 235, 0.15)" }}
      >
        <Image
          src="/images/fundador.webp"
          alt="Thiago Vaz, fundador e estrategista da Brain Marketing & Performance"
          fill
          sizes="(min-width: 1024px) 384px, 90vw"
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to top, #000000 0%, transparent 40%)" }}
        />
        <span className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 rounded-full border border-brand-magenta/40 bg-bg/70 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-magenta backdrop-blur-sm">
          Fundador &amp; Estrategista
        </span>
      </div>
    </MotionReveal>
  );
}
