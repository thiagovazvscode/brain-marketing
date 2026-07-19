import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brain Marketing & Performance · Links",
  description: "Tráfego pago, audiovisual e diagnóstico comercial para o mercado imobiliário.",
  openGraph: {
    title: "Brain Marketing & Performance",
    description: "Tráfego pago, audiovisual e diagnóstico comercial para o mercado imobiliário.",
    url: "https://brainmktp.com.br/hub",
    images: [{ url: "https://brainmktp.com.br/images/logo.png", width: 1200, height: 630 }],
  },
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#000000] text-white">
      {children}
    </div>
  );
}
