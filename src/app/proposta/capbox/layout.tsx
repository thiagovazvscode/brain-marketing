import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposta Comercial · CapBox",
  description:
    "Proposta de tráfego pago da Brain para a CapBox — campanhas de alcance geolocalizado para gerar visitas ao quiosque no Shopping Metrópole.",
  openGraph: {
    title: "Proposta Comercial · CapBox",
    description:
      "Gestão de tráfego pago com alcance geolocalizado para levar motociclistas e entregadores de aplicativo até o quiosque da CapBox. Elaborada pela Brain Marketing & Performance.",
    url: "https://brainmktp.com.br/proposta/capbox",
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

export default function CapboxPropostaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
