import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Briefing · MV Imóveis",
  description: "Briefing interno da Brain para a reunião com a MV Imóveis.",
};

export default function BriefingMvImoveisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
