"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  as?: "div" | "article" | "li";
}

export function GlowCard({
  children,
  className,
  glowColor = "rgba(37, 99, 235, 0.16)",
  as = "div",
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  }

  const Component = as as "div";

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      style={{ ["--glow-color" as string]: glowColor }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-elevated/60 transition-colors duration-300 hover:border-line/80",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(480px circle at var(--glow-x, 50%) var(--glow-y, 50%), var(--glow-color), transparent 65%)",
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </Component>
  );
}
