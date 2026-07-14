"use client";

import { motion } from "framer-motion";
import {
  Megaphone,
  LayoutTemplate,
  UserPlus,
  Headset,
  Handshake,
  CircleDollarSign,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { Button } from "@/components/ui/Button";
import { AnimatedGrid } from "@/components/ui/AnimatedGrid";

const flow = [
  { label: "Anúncio", icon: Megaphone },
  { label: "Landing page", icon: LayoutTemplate },
  { label: "Lead", icon: UserPlus },
  { label: "Atendimento", icon: Headset },
  { label: "Oportunidade", icon: Handshake },
  { label: "Venda", icon: CircleDollarSign },
];

const capabilities = [
  "Estratégia",
  "Segmentação",
  "Criativos",
  "Páginas de conversão",
  "Captação",
  "Remarketing",
  "Análise de dados",
  "Otimização contínua",
  "Integração comercial",
];

export function PaidTraffic() {
  return (
    <section id="trafego-pago" className="relative overflow-hidden bg-surface py-24 sm:py-32">
      <AnimatedGrid fade="bottom" className="opacity-40" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeading
            eyebrow="Serviço principal · Tráfego pago"
            title="O anúncio é só o início do caminho."
            description="A Brain não entrega apenas impulsionamento. Construímos uma rota completa entre o clique e a venda — com estratégia, página, atendimento e dados conectados em um único fluxo."
            className="lg:max-w-md"
          />

          <MotionReveal delay={0.1} className="lg:pt-2">
            <Button href="#contato" size="lg">
              Solicitar um diagnóstico
            </Button>
          </MotionReveal>
        </div>

        <div className="mt-16 overflow-x-auto pb-4">
          <div className="relative flex min-w-[720px] items-center justify-between gap-2 lg:min-w-0">
            <div className="absolute left-0 right-0 top-8 h-px bg-line" />
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "left" }}
              className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-brand-primary to-brand-magenta"
            />

            {flow.map((step, index) => (
              <MotionReveal
                key={step.label}
                delay={index * 0.09}
                direction="none"
                className="relative z-10 flex flex-1 flex-col items-center gap-3 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-bg text-brand-primary shadow-[0_0_0_6px_var(--color-surface)]">
                  <step.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium text-ink/85 sm:text-sm">{step.label}</span>
              </MotionReveal>
            ))}
          </div>
        </div>

        <MotionReveal delay={0.2}>
          <ul className="mt-16 flex flex-wrap gap-3 border-t border-line pt-10">
            {capabilities.map((item) => (
              <li
                key={item}
                className="rounded-full border border-line bg-elevated/60 px-4 py-2 text-sm text-ink/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </MotionReveal>
      </div>
    </section>
  );
}
