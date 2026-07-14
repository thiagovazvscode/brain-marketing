"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { services } from "@/data/services";
import type { Service } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";

export function Services() {
  const [main, ...rest] = services;
  const sideTop = rest.filter((service) => service.size === "md").slice(0, 2);
  const bottomRow = services.filter(
    (service) => !([main.id, ...sideTop.map((s) => s.id)].includes(service.id))
  );

  return (
    <section id="solucoes" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Soluções"
          title="Uma estrutura completa, não peças avulsas."
          description="Cada serviço existe para sustentar o mesmo objetivo: transformar presença digital em demanda real. O tráfego pago está no centro — apoiado por posicionamento, tecnologia e produção."
        />

        <div className="mt-16">
          <MainServiceCard service={main} />

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <SecondaryServiceCard
              service={sideTop[0]}
              className="lg:col-span-5"
              minHeight="lg:min-h-[260px]"
              delay={0.08}
            />
            <SecondaryServiceCard
              service={sideTop[1]}
              className="lg:col-span-7"
              minHeight="lg:min-h-[320px]"
              delay={0.14}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {bottomRow.map((service, index) => (
              <CompactServiceCard key={service.id} service={service} delay={0.2 + index * 0.06} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MainServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] border-l-4 border-l-brand-primary bg-gradient-to-br from-brand-primary/[0.1] via-bg to-bg p-8 transition-all duration-300 hover:bg-white/[0.05] hover:translate-y-[-2px] lg:min-h-[280px] lg:p-10"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-8 select-none font-display text-8xl font-bold text-brand-primary opacity-10 sm:text-9xl"
      >
        {service.number}
      </span>

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:max-w-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line text-brand-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="font-display mt-6 text-2xl font-medium text-ink md:text-3xl">
            {service.title}
          </h3>
          <p className="mt-3 leading-relaxed text-muted">{service.description}</p>
          <a
            href={service.href}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 transition-colors hover:text-brand-primary"
          >
            Saiba mais
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <ul className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2 lg:w-[46%] lg:shrink-0">
          {service.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-ink/75">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-magenta" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function SecondaryServiceCard({
  service,
  className,
  minHeight,
  delay,
}: {
  service: Service;
  className?: string;
  minHeight?: string;
  delay: number;
}) {
  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className={cn(
        "group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] p-7 transition-all duration-300 hover:border-brand-primary/30 hover:bg-white/[0.05] hover:translate-y-[-2px]",
        minHeight,
        className
      )}
    >
      <div>
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-brand-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-sm text-muted/70">{service.number}</span>
        </div>

        <h3 className="font-display mt-5 text-xl font-medium text-ink">{service.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>

        <ul className="mt-4 space-y-2">
          {service.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-ink/75">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-magenta" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <a
        href={service.href}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 transition-colors hover:text-brand-primary"
      >
        Saiba mais
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </motion.div>
  );
}

function CompactServiceCard({ service, delay }: { service: Service; delay: number }) {
  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-brand-primary/30 hover:bg-white/[0.05] hover:translate-y-[-2px]"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-brand-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="font-display text-2xl font-bold text-brand-primary opacity-10">
          {service.number}
        </span>
      </div>

      <h3 className="font-display mt-4 text-lg font-medium text-ink">{service.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>

      <a
        href={service.href}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 transition-colors hover:text-brand-primary"
      >
        Saiba mais
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </motion.div>
  );
}
