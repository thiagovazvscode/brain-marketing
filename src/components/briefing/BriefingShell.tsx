import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { MotionReveal } from "@/components/ui/MotionReveal";

const badgeClass =
  "inline-flex items-center gap-2 rounded-full border border-brand-magenta/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta";

interface BriefingShellProps {
  badgeLabel: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}

export function BriefingShell({ badgeLabel, title, subtitle, children }: BriefingShellProps) {
  return (
    <>
      <header className="relative">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
          <Logo width={140} height={42} priority />
          <span className={badgeClass}>{badgeLabel}</span>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-brand-primary via-brand-magenta to-transparent" />
      </header>

      <section className="relative overflow-hidden px-6 pb-10 pt-14 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37, 99, 235,0.14) 0%, rgba(56, 189, 248,0.06) 55%, transparent 100%)",
          }}
        />
        <div className="mx-auto max-w-2xl text-center">
          <MotionReveal>
            <h1 className="text-balance font-display text-3xl font-bold leading-[1.1] text-white sm:text-4xl">
              {title}
            </h1>
          </MotionReveal>
          {subtitle && (
            <MotionReveal delay={0.08}>
              <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-gray-400 md:text-base">
                {subtitle}
              </p>
            </MotionReveal>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-2xl px-6 pb-24 lg:px-10">{children}</main>

      <footer className="px-6 pb-10 text-center lg:px-10">
        <p className="text-xs text-gray-500">
          Brain Marketing &amp; Performance · brainmktp.com.br
        </p>
      </footer>
    </>
  );
}
