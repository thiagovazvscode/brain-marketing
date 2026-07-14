"use client";

import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlowCard } from "@/components/ui/GlowCard";
import { Logo } from "@/components/ui/Logo";
import { MotionReveal } from "@/components/ui/MotionReveal";

const whatsappMessage =
  "Olá Thiago, aceito a proposta da Brain para Vaz Ferreira Advogados";
const whatsappLink = `https://wa.me/5500000000000?text=${encodeURIComponent(whatsappMessage)}`;

const badgeClass =
  "inline-flex items-center gap-2 rounded-full border border-brand-magenta/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta";

const heroPills = ["Tráfego Pago", "Posicionamento"];

const contextCards = [
  "82% dos clientes pesquisam o advogado online antes de contatar",
  "Autoridade digital reduz o ciclo de vendas em até 40%",
  "Tráfego pago para jurídico gera leads 3x mais qualificados que redes orgânicas",
];

const paidTrafficDeliverables = [
  "Gestão completa de Meta Ads (Instagram + Facebook)",
  "Até 3 campanhas simultâneas ativas",
  "Segmentação por localização, perfil e comportamento",
  "Criativos para anúncios (artes + textos)",
  "Relatório mensal de performance com métricas reais",
  "Otimização contínua quinzenal",
];

const positioningDeliverables = [
  "12 posts no feed por mês (carrosséis jurídicos + institucionais)",
  "6 reels editados por mês (cliente envia o bruto, a Brain edita e entrega)",
  "Legendas estratégicas otimizadas por publicação",
  "Hashtags e horários definidos por dados",
  "Calendário editorial mensal aprovado antes de publicar",
  "1 reunião mensal de alinhamento estratégico (30 min)",
];

const timeline = [
  {
    phase: "Fase 1",
    title: "Diagnóstico & Estrutura",
    desc: "Onboarding, briefing, identidade de conteúdo, configuração de anúncios.",
  },
  {
    phase: "Fase 2",
    title: "Ativação",
    desc: "Primeiras campanhas no ar, primeiros conteúdos publicados.",
  },
  {
    phase: "Fase 3",
    title: "Otimização",
    desc: "Análise dos dados iniciais, ajuste de segmentação e conteúdo.",
  },
  {
    phase: "Fase 4",
    title: "Escala",
    desc: "Ampliar o que funciona, novos formatos de conteúdo.",
  },
  {
    phase: "Fase 5",
    title: "Consolidação",
    desc: "Autoridade crescendo, leads mais qualificados.",
  },
  {
    phase: "Fase 6",
    title: "Resultado & Renovação",
    desc: "Relatório completo, proposta de continuidade.",
  },
];

const included = [
  "Gestão completa de Meta Ads",
  "Criação de 12 posts/mês",
  "Edição de 6 reels/mês",
  "Relatórios mensais",
  "Reunião mensal de alinhamento",
  "Suporte via WhatsApp (dias úteis)",
];

const notIncluded = [
  "Verba de anúncios (recomendamos R$500-800/mês)",
  "Produção de vídeo (cliente fornece o material bruto)",
];

export default function PropostaVazFerreiraPage() {
  return (
    <>
      {/* SEÇÃO 1 — HEADER DA PROPOSTA */}
      <header className="relative">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
          <Logo width={140} height={42} priority />
          <span className={badgeClass}>
            Proposta Comercial · Confidencial
          </span>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-brand-primary via-brand-magenta to-transparent" />
      </header>

      {/* SEÇÃO 2 — HERO DA PROPOSTA */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 lg:px-10 lg:pt-24">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.14) 0%, rgba(217,70,239,0.06) 55%, transparent 100%)",
          }}
        />

        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <span className={badgeClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Elaborada para
            </span>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.05] text-white sm:text-5xl md:text-6xl">
              Vaz Ferreira{" "}
              <span className="bg-gradient-to-r from-violet-500 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                Advogados
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              Proposta de parceria estratégica em marketing digital —
              tráfego pago e posicionamento de autoridade.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.24}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {heroPills.map((pill) => (
                <li key={pill}>
                  <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-1.5 text-xs text-gray-300">
                    {pill}
                  </span>
                </li>
              ))}
            </ul>
          </MotionReveal>

          <MotionReveal delay={0.32}>
            <p className="mt-10 text-xs text-gray-500">Julho de 2026</p>
          </MotionReveal>
        </div>
      </section>

      {/* SEÇÃO 3 — DIAGNÓSTICO / CONTEXTO */}
      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <MotionReveal>
            <h2 className="font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              Por que agora é o momento certo?
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <p className="mt-5 max-w-3xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              O mercado jurídico está passando por uma transformação digital
              acelerada. Escritórios que investem em posicionamento de
              autoridade e captação ativa hoje saem na frente — enquanto a
              concorrência ainda depende de indicação. A Brain foi
              estruturada para resolver exatamente isso: transformar
              presença digital em demanda real e mensurável.
            </p>
          </MotionReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {contextCards.map((text, index) => (
              <MotionReveal key={text} delay={0.12 + index * 0.08}>
                <div className="h-full rounded-2xl border border-brand-primary/10 bg-white/[0.03] p-6">
                  <p className="text-sm leading-relaxed text-gray-300">
                    {text}
                  </p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 4 — SERVIÇOS INCLUÍDOS */}
      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <MotionReveal>
            <h2 className="font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              Serviços incluídos
            </h2>
          </MotionReveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <MotionReveal delay={0.08} direction="left">
              <GlowCard
                className="h-full border-brand-primary/30 p-8"
                glowColor="rgba(124,58,237,0.18)"
              >
                <h3 className="font-display text-2xl font-semibold text-white">
                  Tráfego Pago — Meta Ads
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  Campanhas no Instagram e Facebook com segmentação local e
                  por interesse jurídico, conectadas diretamente ao WhatsApp
                  do escritório.
                </p>
                <ul className="mt-6 space-y-3">
                  {paidTrafficDeliverables.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-gray-300"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-xs leading-relaxed text-gray-400">
                  ⚠️ Verba de anúncios não inclusa — recomendamos R$500 a
                  R$800/mês de investimento em mídia separado.
                </p>
              </GlowCard>
            </MotionReveal>

            <MotionReveal delay={0.16} direction="right">
              <GlowCard
                className="h-full border-brand-magenta/30 p-8"
                glowColor="rgba(217,70,239,0.18)"
              >
                <h3 className="font-display text-2xl font-semibold text-white">
                  Posicionamento de Autoridade — Social Media
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  Construção de presença digital consistente no Instagram
                  com conteúdo jurídico educativo e institucional que gera
                  autoridade e atrai o cliente certo.
                </p>
                <ul className="mt-6 space-y-3">
                  {positioningDeliverables.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-gray-300"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-magenta"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </GlowCard>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* SEÇÃO 5 — COMO TRABALHAMOS JUNTOS */}
      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <MotionReveal>
            <h2 className="font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              Como trabalhamos juntos
            </h2>
          </MotionReveal>

          <div className="relative mt-14">
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-brand-primary via-brand-magenta to-brand-pink lg:block"
            />
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
              {timeline.map((step, index) => (
                <MotionReveal key={step.phase} delay={index * 0.08}>
                  <div className="relative flex flex-col items-start lg:items-center lg:text-center">
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0f0a1e] text-xs font-semibold text-brand-magenta">
                      {index + 1}
                    </span>
                    <span className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-magenta">
                      {step.phase}
                    </span>
                    <h3 className="mt-1 font-display text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">
                      {step.desc}
                    </p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 6 — INVESTIMENTO */}
      <section className="relative overflow-hidden px-6 py-24 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1a0b2e] via-[#0f0a1e] to-[#050510]"
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand-primary/[0.12] blur-[140px]"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <MotionReveal>
            <span className={badgeClass}>Investimento</span>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-brand-magenta">
              Investimento mensal
            </p>
            <p className="mt-4 font-display text-5xl font-bold text-white sm:text-6xl">
              R$ 2.000
              <span className="text-2xl font-medium text-gray-400">/mês</span>
            </p>
          </MotionReveal>

          <div className="mt-14 grid gap-10 text-left sm:grid-cols-2">
            <MotionReveal delay={0.16} direction="left">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
                  O que está incluído
                </h3>
                <ul className="mt-4 space-y-3">
                  {included.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-gray-300"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </MotionReveal>

            <MotionReveal delay={0.24} direction="right">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Não incluso
                </h3>
                <ul className="mt-4 space-y-3">
                  {notIncluded.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-gray-400"
                    >
                      <span className="mt-0.5 shrink-0 text-gray-600" aria-hidden="true">
                        →
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* SEÇÃO 7 — CTA FINAL */}
      <section className="relative overflow-hidden px-6 py-28 text-center lg:px-10">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/[0.12] blur-[140px]"
        />

        <div className="relative mx-auto max-w-2xl">
          <MotionReveal>
            <h2 className="text-balance font-display text-3xl font-medium leading-[1.1] text-white sm:text-4xl md:text-5xl">
              Pronto para transformar sua presença digital em captação real?
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              Clique abaixo para aceitar a proposta e iniciarmos o processo
              de contratação.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                href={whatsappLink}
                external
                size="lg"
                icon={CheckCircle2}
                iconPosition="left"
              >
                Aderir à Proposta
              </Button>
              <Button
                href={whatsappLink}
                external
                size="lg"
                variant="secondary"
                icon={ArrowRight}
              >
                Tirar uma dúvida antes
              </Button>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.24}>
            <p className="mt-10 text-xs text-gray-500">
              Proposta válida por 15 dias · Vaz Ferreira Advogados · Brain
              Marketing &amp; Performance
            </p>
          </MotionReveal>
        </div>
      </section>
    </>
  );
}
