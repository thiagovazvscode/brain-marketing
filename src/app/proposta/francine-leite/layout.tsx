import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposta Comercial · Francine Leite",
  description:
    "Proposta de tráfego pago da Brain para a corretora de imóveis Francine Leite — leads qualificados conectados direto ao WhatsApp.",
  openGraph: {
    title: "Proposta Comercial · Francine Leite",
    description:
      "Gestão de tráfego pago e acesso ao BrokerApps para a corretora Francine Leite. Elaborada pela Brain Marketing & Performance.",
    url: "https://brainmktp.com.br/proposta/francine-leite",
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

export default function FrancineLeitePropostaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
