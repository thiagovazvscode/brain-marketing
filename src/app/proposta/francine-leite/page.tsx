"use client";

import {
  AppWindow,
  ArrowRight,
  BarChart2,
  Check,
  ClipboardList,
  Palette,
  Rocket,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlowCard } from "@/components/ui/GlowCard";
import { Logo } from "@/components/ui/Logo";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { FounderBio } from "@/components/proposals/FounderBio";

const whatsappMessage =
  "Olá Thiago, quero conversar sobre a proposta para Francine Leite";
const whatsappLink = `https://wa.me/5591985855801?text=${encodeURIComponent(whatsappMessage)}`;

const badgeClass =
  "inline-flex items-center gap-2 rounded-full border border-brand-magenta/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta";

const heroPills = ["Tráfego Pago", "Corretora de Imóveis"];

const contextCards = [
  {
    icon: Search,
    text: "Mais de 80% dos compradores de imóvel pesquisam online antes de agendar uma visita",
  },
  {
    icon: Target,
    text: "Campanhas segmentadas por perfil e região aproximam você de quem já está pronto para comprar",
  },
  {
    icon: TrendingUp,
    text: "Resposta rápida no WhatsApp aumenta consideravelmente a chance de transformar o lead em visita",
  },
];

const processSteps = [
  {
    icon: ClipboardList,
    title: "Briefing",
    desc: "Entendemos seu perfil de cliente ideal, os imóveis em destaque na sua carteira e sua região de atuação.",
  },
  {
    icon: Palette,
    title: "Estrutura",
    desc: "Criamos os criativos, os textos e configuramos as campanhas segmentadas para o seu público.",
  },
  {
    icon: Rocket,
    title: "Ativação",
    desc: "Colocamos as campanhas no ar, conectadas diretamente ao seu WhatsApp.",
  },
  {
    icon: BarChart2,
    title: "Escala",
    desc: "Analisamos os dados, otimizamos o que funciona e ampliamos os resultados continuamente.",
  },
];

const paidTrafficDeliverables = [
  "Gestão completa das campanhas no Meta Ads (Instagram e Facebook)",
  "Campanhas ativas continuamente, sempre otimizadas",
  "Segmentação por perfil de comprador e região de atuação",
  "Criação de artes e textos para os anúncios",
  "Conexão direta com o seu WhatsApp",
  "Relatório mensal com métricas reais",
  "Otimizações contínuas",
];

const brokerAppsFeatures = [
  "CRM kanban para organizar seus leads e atendimentos",
  "Vitrine digital para apresentar seus imóveis",
  "Dashboard do Meta Ads integrado, com seus resultados em tempo real",
];

const included = [
  "Gestão de tráfego pago no Meta Ads, com otimização contínua",
  "Segmentação por perfil de comprador e região de atuação",
  "Criação de criativos e textos para os anúncios",
  "Campanhas conectadas ao seu WhatsApp",
  "Relatório mensal de performance",
  "Acesso ao BrokerApps (CRM, vitrine digital e dashboard integrado)",
];

const notIncluded = [
  "Verba de anúncios (valor avulso, investida diretamente no Meta Ads, definida com você)",
];

const faqItems = [
  {
    q: "Preciso ter site próprio para rodar as campanhas?",
    a: "Não. As campanhas podem direcionar direto para o seu WhatsApp, sem depender de um site.",
  },
  {
    q: "Vocês atendem corretores autônomos ou só imobiliárias?",
    a: "Atendemos os dois. A estrutura da campanha é adaptada ao seu jeito de atuar, com ou sem equipe por trás.",
  },
  {
    q: "Quanto tempo até os primeiros resultados aparecerem?",
    a: "As campanhas ficam no ar em até 15 dias após a aprovação da proposta, com os primeiros leads chegando ainda no primeiro mês.",
  },
  {
    q: "Como funciona o BrokerApps que vem incluso?",
    a: "É uma plataforma de CRM com IA: organização de leads em kanban, vitrine digital dos seus imóveis e um dashboard do Meta Ads integrado — tudo incluso, sem custo adicional.",
  },
  {
    q: "A verba de anúncio é paga para a Brain?",
    a: "Não. É um valor avulso, pago direto na plataforma (Meta Ads), separado do valor de gestão — total transparência sobre quanto está sendo investido em mídia.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Não há fidelidade — basta avisar com antecedência, conforme combinado no contrato.",
  },
];

export default function PropostaFrancineLeitePage() {
  return (
    <>
      {/* SEÇÃO 1 — HEADER */}
      <header className="relative">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
          <Logo width={140} height={42} priority />
          <span className={badgeClass}>Proposta Comercial · Confidencial</span>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-brand-primary via-brand-magenta to-transparent" />
      </header>

      {/* SEÇÃO 2 — HERO */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 lg:px-10 lg:pt-24">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37, 99, 235,0.14) 0%, rgba(56, 189, 248,0.06) 55%, transparent 100%)",
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
              Francine{" "}
              <span className="bg-gradient-to-r from-blue-500 to-slate-500 bg-clip-text text-transparent">
                Leite
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              Uma estrutura de tráfego pago pensada para gerar leads
              qualificados para a sua carteira de imóveis.
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
        </div>
      </section>

      {/* SEÇÃO 3 — POR QUE AGORA? */}
      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <MotionReveal>
            <span className={badgeClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Contexto
            </span>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <h2 className="mt-6 font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              Corretor com presença digital forte fecha mais rápido.
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <p className="mt-5 max-w-3xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              Corretores que dependem só de indicação e do boca a boca estão
              perdendo espaço para quem investe em tráfego pago segmentado.
              Depois de anos de mercado, sua experiência já gera confiança —
              falta o anúncio certo pra colocar isso na frente do comprador
              certo.
            </p>
          </MotionReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {contextCards.map((card, index) => (
              <MotionReveal key={card.text} delay={0.2 + index * 0.08}>
                <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] text-brand-magenta">
                    <card.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-sm leading-relaxed text-gray-300">
                    {card.text}
                  </p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 4 — O QUE SERÁ ENTREGUE */}
      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <MotionReveal>
            <h2 className="font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              O que será entregue
            </h2>
          </MotionReveal>

          <div className="mt-12">
            <MotionReveal delay={0.08}>
              <GlowCard
                className="mx-auto max-w-2xl p-8"
                glowColor="rgba(37, 99, 235,0.18)"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary/30 text-brand-primary">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-2xl font-semibold text-white">
                  Gestão de Tráfego Pago
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  Campanhas no Meta Ads (Instagram e Facebook) segmentadas
                  para o seu perfil de cliente, conectadas direto ao seu
                  WhatsApp.
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
                <p className="mt-6 text-xs leading-relaxed text-gray-500">
                  A verba de anúncios não está inclusa no valor da gestão.
                </p>
              </GlowCard>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4B — BROKERAPPS */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <MotionReveal>
            <GlowCard
              className="grid gap-8 p-8 lg:grid-cols-[auto_1fr] lg:items-center lg:p-10"
              glowColor="rgba(56, 189, 248,0.18)"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-magenta/30 text-brand-magenta">
                <AppWindow className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <span className={badgeClass}>Diferencial Brain · Sem custo adicional</span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-white">
                  Acesso ao BrokerApps
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                  Além da gestão de tráfego, você ganha acesso à plataforma{" "}
                  <a
                    href="https://brokerapps.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary underline decoration-brand-primary/40 underline-offset-4 hover:decoration-brand-primary"
                  >
                    BrokerApps
                  </a>{" "}
                  — CRM com IA para organizar sua operação do lead à venda.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                  {brokerAppsFeatures.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-gray-300"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-magenta"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlowCard>
          </MotionReveal>
        </div>
      </section>

      {/* SEÇÃO 5 — COMO TRABALHAMOS */}
      <section className="relative overflow-hidden px-6 py-20 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(37, 99, 235,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-6xl">
          <MotionReveal>
            <span className={badgeClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Processo
            </span>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <h2 className="mt-6 font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              Do briefing à escala — sem enrolação.
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              Antes de qualquer anúncio, entendemos o seu momento. Cada etapa
              tem um propósito claro.
            </p>
          </MotionReveal>

          <div className="relative mt-14">
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-7 hidden border-t border-dashed border-white/20 lg:block"
            />
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {processSteps.map((step, index) => {
                const isMagenta = index % 2 === 1;
                return (
                  <MotionReveal key={step.title} delay={index * 0.1}>
                    <div className="relative flex flex-col items-start lg:items-center lg:text-center">
                      <span
                        className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border bg-[#0d1017] ${
                          isMagenta
                            ? "border-brand-magenta/30 text-brand-magenta"
                            : "border-brand-primary/30 text-brand-primary"
                        }`}
                      >
                        <step.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 font-display text-base font-semibold text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">
                        {step.desc}
                      </p>
                    </div>
                  </MotionReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 5B — QUEM CONDUZ O PROJETO */}
      <FounderBio />

      {/* SEÇÃO 6 — INVESTIMENTO */}
      <section className="relative overflow-hidden px-6 py-24 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a0e16] via-[#0d1017] to-[#000000]"
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
              R$ 1.500
              <span className="text-2xl font-medium text-gray-400">/mês</span>
            </p>
          </MotionReveal>

          <div className="mt-14 grid gap-10 text-left sm:grid-cols-2">
            <MotionReveal delay={0.16} direction="left">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
                  O que está incluso
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

      {/* SEÇÃO 6B — FAQ */}
      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <MotionReveal>
            <span className={badgeClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Perguntas frequentes
            </span>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <h2 className="mt-6 font-display text-balance text-3xl font-medium leading-[1.1] text-white sm:text-4xl">
              Antes de decidir, tira aqui as dúvidas mais comuns.
            </h2>
          </MotionReveal>

          <div className="mt-10 grid gap-4">
            {faqItems.map((item, index) => (
              <MotionReveal key={item.q} delay={0.05 + index * 0.05}>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                  <h3 className="font-display text-base font-semibold text-white">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {item.a}
                  </p>
                </div>
              </MotionReveal>
            ))}
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
              Ficou com alguma dúvida ou quer ajustar algo antes de fechar?
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              Entre em contato diretamente com Thiago Vaz para conversarmos.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <div className="mt-10 flex justify-center">
              <Button href={whatsappLink} external size="lg" icon={ArrowRight}>
                Falar no WhatsApp
              </Button>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.24}>
            <p className="mt-10 text-xs text-gray-500">
              Brain Marketing &amp; Performance · brainmktp.com.br
            </p>
          </MotionReveal>
        </div>
      </section>
    </>
  );
}
