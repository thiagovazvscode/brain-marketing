import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposta Comercial",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PropostaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#050510] text-white">{children}</div>;
}
