"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MotionReveal } from "@/components/ui/MotionReveal";

const indicators = [
  { color: "#2563eb", label: "Estratégia antes da execução" },
  { color: "#38bdf8", label: "Aquisição conectada à venda" },
  { color: "#64748b", label: "Performance orientada a dados" },
];

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center overflow-hidden bg-[#000000] pb-20 pt-32 sm:pt-36"
    >
      {/* Camada 1: imagem de fundo */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/bg-hero.webp"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", opacity: 0.12, mixBlendMode: "luminosity" }}
        />
      </div>

      {/* Camada 2: gradiente radial central azul */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 60% 50%, rgba(37, 99, 235,0.10) 0%, rgba(56, 189, 248,0.05) 60%, transparent 100%)",
        }}
      />

      {/* Camada 3: grade de linhas finas */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Camada 4: vinheta nas bordas */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, #000000 100%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10">
        <div>
          <MotionReveal delay={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-magenta/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-magenta">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Marketing, tecnologia e performance
            </span>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <h1 className="font-display text-balance text-4xl leading-[1.08] sm:text-5xl md:text-6xl lg:text-[3.6rem]">
              <span className="font-bold text-white">Marketing que gera demanda.</span>{" "}
              <span className="font-medium text-white">
                <span className="bg-gradient-to-r from-blue-500 via-sky-400 to-slate-500 bg-clip-text text-transparent">
                  Performance
                </span>{" "}
                que sustenta o crescimento.
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-gray-400 md:text-lg">
              A Brain conecta estratégia, criatividade, tráfego pago e
              tecnologia à sua operação comercial — para empresas de
              qualquer segmento, com especialidade profunda no mercado
              imobiliário.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.28}>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href="#contato" size="lg" icon={ArrowRight}>
                Solicitar um diagnóstico
              </Button>
              <Button href="#solucoes" size="lg" variant="secondary">
                Conhecer as soluções
              </Button>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.38}>
            <ul className="mt-12 flex flex-wrap gap-3">
              {indicators.map((item) => (
                <li key={item.label}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs text-ink/80">
                    <span aria-hidden="true" style={{ color: item.color }}>
                      ●
                    </span>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </MotionReveal>
        </div>

        <div className="relative mx-auto mt-2 aspect-[4/3] w-full max-w-sm sm:max-w-md lg:hidden">
          <NeuralNetwork variant="mobile" />
        </div>

        <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
          <NeuralNetwork variant="desktop" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted sm:flex"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Role para explorar</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </motion.span>
      </motion.div>
    </section>
  );
}

interface SynapseNode {
  x: number;
  y: number;
  label: string;
}

const desktopNodeLabels = [
  "Tráfego Pago",
  "Meta Ads",
  "Google Ads",
  "Posicionamento",
  "Landing Pages",
  "Audiovisual",
  "Consultoria",
  "Tecnologia",
  "CRM",
  "Funil",
  "Criativos",
  "Performance",
];

const desktopNodes: SynapseNode[] = [
  { x: 70, y: 55 },
  { x: 150, y: 22 },
  { x: 235, y: 50 },
  { x: 295, y: 118 },
  { x: 260, y: 202 },
  { x: 300, y: 275 },
  { x: 218, y: 305 },
  { x: 138, y: 315 },
  { x: 58, y: 262 },
  { x: 22, y: 182 },
  { x: 42, y: 108 },
  { x: 172, y: 168 },
].map((node, index) => ({
  ...node,
  label: desktopNodeLabels[index],
}));

const desktopEdges: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 0],
  [11, 0],
  [11, 2],
  [11, 4],
  [11, 6],
  [11, 8],
  [11, 10],
];

const mobileNodes: SynapseNode[] = [
  { x: 40, y: 40, label: "Tráfego Pago" },
  { x: 150, y: 20, label: "Posicionamento" },
  { x: 260, y: 45, label: "Landing Pages" },
  { x: 270, y: 130, label: "Audiovisual" },
  { x: 150, y: 160, label: "Consultoria" },
  { x: 30, y: 130, label: "Tecnologia" },
];

const mobileEdges: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [4, 1],
];

function NeuralNetwork({ variant }: { variant: "desktop" | "mobile" }) {
  const nodes = variant === "desktop" ? desktopNodes : mobileNodes;
  const edges = variant === "desktop" ? desktopEdges : mobileEdges;
  const viewBox = variant === "desktop" ? "0 0 320 340" : "0 0 300 190";
  const center = variant === "desktop" ? 160 : 150;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="animate-pulse-glow absolute h-72 w-72 rounded-full bg-brand-primary/20" />
      <div className="animate-pulse-glow absolute h-56 w-56 rounded-full bg-brand-magenta/10 [animation-delay:1.4s]" />

      <svg
        viewBox={viewBox}
        className="relative h-[92%] w-[92%] overflow-visible"
        aria-hidden="true"
      >
        <g style={{ filter: "drop-shadow(0 0 4px rgba(37, 99, 235,0.35))" }}>
          {edges.map(([a, b], index) => {
            const na = nodes[a];
            const nb = nodes[b];
            const lineColor = index % 2 === 0 ? "rgba(37, 99, 235,0.4)" : "rgba(100, 116, 139,0.3)";
            const pulseDuration = 2 + ((index * 11) % 20) / 10;
            return (
              <motion.line
                key={`${a}-${b}`}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke={lineColor}
                strokeWidth={0.8}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0.2, 0.6, 0.2] }}
                transition={{
                  pathLength: { delay: 0.3 + index * 0.08, duration: 1, ease: "easeInOut" },
                  opacity: {
                    delay: 1 + index * 0.1,
                    duration: pulseDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              />
            );
          })}
        </g>

        <SignalParticles nodes={nodes} edges={edges} variant={variant} />

        {nodes.map((node, index) => {
          const isMagenta = index % 2 === 1;
          const color = isMagenta ? "#38bdf8" : "#2563eb";
          const glowColor = isMagenta ? "rgba(56, 189, 248,0.8)" : "rgba(37, 99, 235,0.8)";
          const anchor = node.x > center + 10 ? "start" : node.x < center - 10 ? "end" : "middle";
          const dx = anchor === "start" ? 10 : anchor === "end" ? -10 : 0;
          const dy = node.y < 30 ? -10 : 12;
          const floatDuration = 3 + ((index * 7) % 10) / 5;
          const floatDelay = ((index * 13) % 20) / 10;
          const haloDelay = ((index * 9) % 15) / 10;

          return (
            <motion.g
              key={`${node.x}-${node.y}`}
              animate={{ y: [0, -6, 0, 4, 0], opacity: [0.8, 1, 0.8] }}
              transition={{
                duration: floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: floatDelay,
              }}
            >
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={variant === "desktop" ? 10 : 8}
                fill={color}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: haloDelay,
                }}
              />

              <motion.circle
                cx={node.x}
                cy={node.y}
                r={variant === "desktop" ? 6 : 4.5}
                fill={color}
                style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.25, 1, 1.15, 1], opacity: 1 }}
                transition={{
                  scale: {
                    delay: 0.15 * index,
                    duration: 2.6,
                    repeat: Infinity,
                    repeatDelay: 1.6,
                    ease: "easeInOut",
                  },
                  opacity: { delay: 0.15 * index, duration: 0.4 },
                }}
              />

              <text
                x={node.x + dx}
                y={node.y + dy}
                textAnchor={anchor}
                fontSize={variant === "desktop" ? 9 : 7.5}
                fontWeight={500}
                letterSpacing="0.02em"
                fill="rgba(255,255,255,0.8)"
                stroke="#000000"
                strokeWidth={3}
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

function SignalParticles({
  nodes,
  edges,
  variant,
}: {
  nodes: SynapseNode[];
  edges: [number, number][];
  variant: "desktop" | "mobile";
}) {
  const particleEdgeIndices = variant === "desktop" ? [0, 2, 5, 9, 13] : [0, 2, 5];

  return (
    <>
      {particleEdgeIndices.map((edgeIndex, i) => {
        const [a, b] = edges[edgeIndex];
        const na = nodes[a];
        const nb = nodes[b];
        return (
          <motion.circle
            key={`particle-${edgeIndex}`}
            r={3}
            fill="#38bdf8"
            style={{ filter: "drop-shadow(0 0 4px rgba(56, 189, 248,0.9))" }}
            initial={{ opacity: 0 }}
            animate={{
              cx: [na.x, nb.x],
              cy: [na.y, nb.y],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              delay: 1.2 + i * 0.6,
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "linear",
            }}
          />
        );
      })}
    </>
  );
}
