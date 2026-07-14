"use client";

import { motion } from "framer-motion";
import {
  ScanSearch,
  Link2,
  Sparkles,
  Building2,
  Database,
  Users,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const differentials = [
  {
    icon: ScanSearch,
    title: "Estratégia antes da execução",
    description:
      "Nenhuma campanha entra no ar sem diagnóstico prévio da operação, do público e da oferta.",
  },
  {
    icon: Link2,
    title: "Marketing conectado às vendas",
    description:
      "Leads chegam organizados, com contexto e prioridade — não soltos em uma planilha.",
  },
  {
    icon: Sparkles,
    title: "Criativos pensados para performance",
    description:
      "Cada peça é testada e ajustada com base em dado, não apenas em preferência estética.",
  },
  {
    icon: Building2,
    title: "Especialização imobiliária",
    description:
      "Domínio da jornada de compra, da sazonalidade e da linguagem específica do setor.",
  },
  {
    icon: Database,
    title: "Tecnologia e dados",
    description:
      "Broker Apps e indicadores acompanham cada etapa do funil em tempo real.",
  },
  {
    icon: Users,
    title: "Acompanhamento próximo",
    description:
      "Relatórios e ajustes recorrentes, com decisões revisadas junto ao cliente.",
  },
];

export function Differentials() {
  const listItems = differentials.slice(0, 3);
  const highlightItems = differentials.slice(3, 6);

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Diferenciais"
          title="O que muda quando existe estrutura por trás do anúncio."
          align="center"
          className="mx-auto"
        />

        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="divide-y divide-white/[0.06] lg:col-span-5">
            {listItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="py-7 first:pt-0 last:pb-0"
              >
                <span className="font-display text-sm text-brand-primary/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col gap-5 lg:col-span-7">
            {highlightItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-7 transition-all duration-300 hover:border-brand-primary/30 hover:bg-white/[0.06] hover:translate-y-[-2px]"
              >
                <item.icon className="h-6 w-6 text-brand-primary" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
