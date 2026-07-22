import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposta Comercial · MV Imóveis",
  description:
    "Proposta de tráfego pago da Brain para a MV Imóveis — leads qualificados de compradores de imóveis em Belém.",
  openGraph: {
    title: "Proposta Comercial · MV Imóveis",
    description:
      "Gestão de tráfego pago segmentado para geração de leads imobiliários em Belém. Elaborada pela Brain Marketing & Performance.",
    url: "https://brainmktp.com.br/proposta/mv-imoveis",
    siteName: "Brain Marketing & Performance",
    images: [
      {
        url: "https://brainmktp.com.br/favicon.png",
        width: 1200,
        height: 630,
        alt: "Brain Marketing & Performance",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
};

export default function MvImoveisPropostaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
