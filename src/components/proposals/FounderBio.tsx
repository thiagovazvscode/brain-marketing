"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { MotionReveal } from "@/components/ui/MotionReveal";

const badgeClass =
  "inline-flex items-center gap-2 rounded-full border border-brand-magenta/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta";

const bioBullets = [
  "Mais de 15 anos de carreira em tecnologia, marketing e vendas",
  "Passagens por OLX, Grupo Zap e Viva Real, no mercado imobiliário",
  "Consultoria de tecnologia, marketing e vendas na TOTVS para atacadistas, supermercados, varejistas e distribuidores",
  "Estruturação de times comerciais e de marketing do zero",
  "Condução de projetos de grande porte, do diagnóstico à execução",
  "Treinamento de equipes de vendas e atendimento",
  "Contratação e gestão de agências de marketing atuando lado a lado com a operação",
];

export function FounderBio() {
  return (
    <section className="px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
          <MotionReveal direction="left">
            <div
              className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-3xl"
              style={{ height: "320px", boxShadow: "0 0 60px rgba(37, 99, 235, 0.15)" }}
            >
              <Image
                src="/images/fundador.webp"
                alt="Thiago Vaz, fundador e estrategista da Brain Marketing & Performance"
                fill
                sizes="280px"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to top, #000000 0%, transparent 40%)" }}
              />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1} direction="right">
            <span className={badgeClass}>Quem conduz o seu projeto</span>
            <h3 className="mt-5 font-display text-2xl font-semibold text-white md:text-3xl">
              Thiago Vaz
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
              Fundador &amp; Estrategista da Brain
            </p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-gray-400">
              Antes de fundar a Brain, passei mais de 15 anos construindo
              carreira em tecnologia, marketing e vendas — como diretor
              comercial, gestor e consultor. Atuei no mercado imobiliário (OLX,
              Grupo Zap, Viva Real) e também na TOTVS, multinacional de
              tecnologia, prestando consultoria de tecnologia, marketing e
              vendas para atacadistas, supermercados, varejistas e
              distribuidores.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {bioBullets.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-gray-300"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-xl text-sm italic leading-relaxed text-gray-500">
              Hoje aplico essa vivência prática — em diferentes setores, não
              só no mercado imobiliário — em cada proposta da Brain.
            </p>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
