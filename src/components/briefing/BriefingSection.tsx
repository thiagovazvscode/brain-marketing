import type { ReactNode } from "react";
import { MotionReveal } from "@/components/ui/MotionReveal";

interface BriefingSectionProps {
  step: number;
  title: string;
  delay?: number;
  children: ReactNode;
}

export function BriefingSection({ step, title, delay = 0, children }: BriefingSectionProps) {
  return (
    <MotionReveal delay={delay}>
      <div className="mb-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-primary/30 text-sm font-semibold text-brand-primary">
            {step}
          </span>
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
        </div>
        {children}
      </div>
    </MotionReveal>
  );
}
