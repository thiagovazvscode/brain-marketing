"use client";

import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { AnimatedGrid } from "@/components/ui/AnimatedGrid";
import { getWhatsappLink, defaultWhatsappMessage } from "@/config/site";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <Image
          src="/images/bg-cta.webp"
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-brand-primary/20" />
      </div>

      <AnimatedGrid />
      <div
        className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/[0.1] blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1c2230]/40 blur-[160px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-10">
        <MotionReveal>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-magenta/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            Vamos conversar
          </span>
        </MotionReveal>

        <MotionReveal delay={0.08}>
          <h2 className="font-display text-balance text-3xl font-medium leading-[1.1] text-ink sm:text-4xl md:text-5xl">
            Seu crescimento não começa com mais anúncios.
            <br className="hidden sm:block" /> Começa com uma estrutura melhor.
          </h2>
        </MotionReveal>

        <MotionReveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-muted md:text-lg">
            Um diagnóstico mostra onde sua operação perde oportunidades — e o
            que precisa existir antes de investir em mais tráfego.
          </p>
        </MotionReveal>

        <MotionReveal delay={0.26}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              href={getWhatsappLink(defaultWhatsappMessage)}
              external
              size="lg"
              icon={MessageCircle}
              iconPosition="left"
            >
              Falar no WhatsApp
            </Button>
            <Button href="#contato" size="lg" variant="secondary" icon={ArrowRight}>
              Preencher formulário
            </Button>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
