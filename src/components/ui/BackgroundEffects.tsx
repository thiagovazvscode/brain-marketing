"use client";

import { useSyncExternalStore } from "react";
import { useMousePosition } from "@/hooks/useMousePosition";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const DESKTOP_QUERY = "(min-width: 1024px) and (hover: hover)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function BackgroundEffects() {
  const { x, y } = useMousePosition();
  const prefersReduced = useReducedMotion();
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="bg-noise absolute inset-0" />

      {isDesktop && !prefersReduced && (
        <div
          className="absolute h-[420px] w-[420px] rounded-full opacity-[0.07] blur-[100px] transition-transform duration-300 ease-out"
          style={{
            background:
              "radial-gradient(circle, rgba(37, 99, 235,1) 0%, rgba(56, 189, 248,0.6) 45%, transparent 70%)",
            transform: `translate3d(${x - 210}px, ${y - 210}px, 0)`,
          }}
        />
      )}

      <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-primary/[0.05] blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-5%] h-[420px] w-[420px] rounded-full bg-brand-pink/[0.06] blur-[120px]" />
    </div>
  );
}
