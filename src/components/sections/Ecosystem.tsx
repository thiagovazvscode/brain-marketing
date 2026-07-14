"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { ecosystemNodes } from "@/data/ecosystem";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";

export function Ecosystem() {
  const total = ecosystemNodes.length;
  const radius = 42;

  return (
    <section id="ecossistema" className="relative overflow-hidden bg-[#050510] py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Ecossistema Brain"
          title="Soluções que funcionam separadas — ou em conjunto."
          description="Marketing, tecnologia, consultoria e produção fazem parte do mesmo sistema. Uma empresa pode contratar uma frente específica ou conectar tudo em uma única operação, incluindo o Broker Apps."
          align="center"
          className="mx-auto"
        />

        <div className="relative mx-auto mt-20 hidden aspect-square w-full max-w-xl lg:block">
          {/* Anel externo — rotação lenta */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-line"
          />
          <div className="animate-spin-slow-reverse absolute inset-[12%] rounded-full border border-dashed border-line/70" />

          {/* Linhas de conexão — sinapses do centro para os itens */}
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="synapseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {ecosystemNodes.map((node, index) => {
              const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);

              return (
                <g key={node.id}>
                  <motion.line
                    x1={50}
                    y1={50}
                    x2={x}
                    y2={y}
                    stroke="url(#synapseGradient)"
                    strokeWidth={0.4}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{
                      duration: 2 + index * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.circle
                    r={0.8}
                    fill="#D946EF"
                    initial={{ opacity: 0 }}
                    animate={{ cx: [50, x], cy: [50, y], opacity: [0, 1, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.25,
                      ease: "linear",
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Centro — ícone de cérebro */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 30px rgba(124,58,237,0.3)",
                  "0 0 60px rgba(124,58,237,0.6)",
                  "0 0 30px rgba(124,58,237,0.3)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-brand-primary/50 bg-elevated text-center"
            >
              <Brain
                className="h-10 w-10 text-brand-primary"
                style={{
                  filter:
                    "drop-shadow(0 0 20px rgba(124,58,237,0.6)) drop-shadow(0 0 40px rgba(124,58,237,0.3))",
                }}
                aria-hidden="true"
              />
              <span className="mt-2 text-[10px] font-medium uppercase tracking-widest text-violet-300">
                Núcleo
              </span>
            </motion.div>
          </motion.div>

          {/* Itens do ecossistema — flutuação independente, sem rotação */}
          {ecosystemNodes.map((node, index) => {
            const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + index * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="group absolute w-32 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  animate={{
                    y: [0, -5, 0, 3, 0],
                    opacity: [0.85, 1, 0.85],
                  }}
                  transition={{
                    duration: 3 + index * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.3,
                  }}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-bg text-brand-magenta transition-colors group-hover:border-brand-magenta/60">
                    <node.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium leading-tight text-ink/85">{node.label}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:hidden">
          {ecosystemNodes.map((node, index) => (
            <MotionReveal key={node.id} delay={index * 0.06}>
              <div className="flex h-full flex-col items-center gap-3 rounded-xl border border-line bg-elevated/50 p-5 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-brand-magenta">
                  <node.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-ink/85">{node.label}</span>
              </div>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
