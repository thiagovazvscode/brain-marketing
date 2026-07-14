import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MotionReveal } from "@/components/ui/MotionReveal";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  id,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <MotionReveal delay={0}>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-magenta/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-magenta" />
            {eyebrow}
          </span>
        </MotionReveal>
      )}
      <MotionReveal delay={0.08}>
        <h2
          id={id}
          className="font-display text-balance text-3xl font-medium leading-[1.1] text-ink sm:text-4xl md:text-5xl"
        >
          {title}
        </h2>
      </MotionReveal>
      {description && (
        <MotionReveal delay={0.16}>
          <p className="mt-5 text-balance text-base leading-relaxed text-muted md:text-lg">
            {description}
          </p>
        </MotionReveal>
      )}
    </div>
  );
}
