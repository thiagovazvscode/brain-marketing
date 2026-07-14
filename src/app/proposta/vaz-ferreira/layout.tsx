import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposta Comercial · Vaz Ferreira Advogados",
  description:
    "Proposta de marketing digital da Brain — tráfego pago e posicionamento para Vaz Ferreira Advogados.",
  openGraph: {
    title: "Proposta Comercial · Vaz Ferreira Advogados",
    description:
      "Tráfego pago e posicionamento digital. Elaborada pela Brain Marketing & Performance.",
    url: "https://brainmktp.com.br/proposta/vaz-ferreira",
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

export default function VazFerreiraPropostaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
