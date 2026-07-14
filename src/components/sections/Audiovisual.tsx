"use client";

import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";

const capabilities = [
  "Vídeos comerciais e institucionais",
  "Fotografia profissional de imóveis",
  "Filmagem com drone",
  "Conteúdo para redes sociais",
  "Produção para lançamentos",
];

export function Audiovisual() {
  return (
    <section
      id="audiovisual"
      className="relative overflow-hidden"
      style={{ minHeight: "600px" }}
    >
      {/* Background drone */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/images/bg-audiovisual.webp"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center", opacity: 0.2 }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #050510 0%, rgba(5,5,16,0.75) 45%, rgba(5,5,16,0.45) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[600px] max-w-7xl flex-col justify-center px-6 py-24 sm:py-32 lg:px-10">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeading
            eyebrow="Audiovisual"
            title="Produção pensada para imóveis e campanhas de alto padrão."
            description="Imagem é parte da estratégia, não um extra. Cada captação é planejada para reforçar posicionamento e alimentar campanhas — do drone ao corte final."
            className="lg:max-w-md"
          />
          <MotionReveal delay={0.1} className="lg:pt-2">
            <ul className="space-y-3">
              {capabilities.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-white/80">
                  <span className="h-1 w-1 rounded-full bg-brand-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
