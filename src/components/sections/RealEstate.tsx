"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";

const audienceLabels = ["Corretores", "Imobiliárias", "Incorporadoras", "Lançamentos"];

const expertise = [
  "Jornada de compra do imóvel",
  "Leads imobiliários qualificados",
  "Campanhas para portfólio de imóveis",
  "Campanhas de lançamento",
  "Posicionamento de corretores",
  "Audiovisual imobiliário",
  "Integração com CRM",
  "Organização de funil",
  "Estratégia de atendimento",
  "Conversão em vendas",
];

export function RealEstate() {
  return (
    <section
      id="especialidade"
      className="relative overflow-hidden"
      style={{ minHeight: "600px" }}
    >
      {/* Background imobiliário */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/images/bg-imobiliario.webp"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center top", opacity: 0.18 }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #000000 35%, rgba(5,5,16,0.80) 60%, rgba(5,5,16,0.50) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-10">
        <SectionHeading
          eyebrow="Especialidade"
          title="Especialistas no mercado imobiliário. Preparados para outros mercados."
          description="Anos de imersão no setor imobiliário deram à Brain um domínio raro sobre a jornada de compra, o comportamento dos leads e o ritmo comercial desse mercado — conhecimento que também eleva o padrão do trabalho para empresas de outros segmentos."
        />

        <MotionReveal delay={0.15}>
          <div className="mt-10 flex flex-wrap gap-3">
            {audienceLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70"
              >
                {label}
              </span>
            ))}
          </div>
        </MotionReveal>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-12 rounded-2xl border-l-4 border-brand-primary bg-white/[0.05] p-8 backdrop-blur-sm lg:p-10"
        >
          <h3 className="font-display text-lg font-medium text-white">
            Domínio de ponta a ponta do ciclo imobiliário
          </h3>
          <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {expertise.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
