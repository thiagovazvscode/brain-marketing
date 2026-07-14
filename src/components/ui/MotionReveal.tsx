"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Direction = "up" | "down" | "left" | "right" | "none";

interface MotionRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  className?: string;
  once?: boolean;
  as?: "div" | "span" | "li";
}

const directionOffsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 28 },
  right: { x: -28 },
  none: {},
};

export function MotionReveal({
  children,
  delay = 0,
  duration = 0.7,
  direction = "up",
  className,
  once = true,
  as = "div",
}: MotionRevealProps) {
  const prefersReduced = useReducedMotion();
  const offset = directionOffsets[direction];

  if (prefersReduced) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  const Component = motion[as];

  return (
    <Component
      initial={{ opacity: 0, x: offset.x ?? 0, y: offset.y ?? 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Component>
  );
}
