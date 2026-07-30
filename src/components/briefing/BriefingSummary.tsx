"use client";

import { useState } from "react";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlowCard } from "@/components/ui/GlowCard";
import { MotionReveal } from "@/components/ui/MotionReveal";

export interface SummarySection {
  title: string;
  fields: [string, string][];
}

interface BriefingSummaryProps {
  timestampFormatted: string;
  sections: SummarySection[];
  summaryText: string;
  onDownloadAgain: () => void;
  onReset: () => void;
}

export function BriefingSummary({
  timestampFormatted,
  sections,
  summaryText,
  onDownloadAgain,
  onReset,
}: BriefingSummaryProps) {
  const [copyFeedback, setCopyFeedback] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyFeedback("Resumo copiado para a área de transferência!");
    } catch {
      setCopyFeedback("Não foi possível copiar automaticamente.");
    }
  }

  return (
    <div>
      <MotionReveal>
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-brand-primary/15 px-5 py-4 ring-1 ring-brand-primary/30">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
            <Check className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-white">Briefing salvo com sucesso!</p>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <GlowCard className="p-6 md:p-7" glowColor="rgba(37, 99, 235, 0.18)">
          <h2 className="font-display text-lg font-semibold text-white">Resumo do briefing</h2>
          <p className="mt-1 text-xs text-muted">Preenchido em {timestampFormatted}</p>

          <div className="mt-5 space-y-5">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wide text-brand-magenta">
                  {section.title}
                </h3>
                <dl className="space-y-1.5">
                  {section.fields.map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
                      <dt className="shrink-0 font-medium text-muted sm:w-52">{label}</dt>
                      <dd className="whitespace-pre-wrap text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </GlowCard>
      </MotionReveal>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="secondary" icon={Copy} iconPosition="left" onClick={handleCopy}>
          Copiar resumo
        </Button>
        <Button type="button" variant="secondary" icon={Download} iconPosition="left" onClick={onDownloadAgain}>
          Baixar JSON novamente
        </Button>
        <Button type="button" variant="ghost" icon={RotateCcw} iconPosition="left" onClick={onReset}>
          Preencher novo briefing
        </Button>
      </div>
      {copyFeedback && (
        <p className="mt-3 text-center text-xs font-medium text-brand-primary">{copyFeedback}</p>
      )}
    </div>
  );
}
