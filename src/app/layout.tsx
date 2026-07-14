import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { BackgroundEffects } from "@/components/ui/BackgroundEffects";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Brain Marketing & Performance | Estratégia, Tráfego e Crescimento",
    template: "%s | Brain Marketing & Performance",
  },
  description: siteConfig.description,
  keywords: [
    "agência de marketing",
    "tráfego pago",
    "performance",
    "marketing imobiliário",
    "Meta Ads",
    "Google Ads",
    "posicionamento de marca",
    "landing page",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "Brain Marketing & Performance | Estratégia, Tráfego e Crescimento",
    description: siteConfig.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brain Marketing & Performance | Estratégia, Tráfego e Crescimento",
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#050510",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-bg text-ink">
        <BackgroundEffects />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
