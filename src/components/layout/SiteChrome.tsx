"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useTrackingSession } from "@/hooks/useTrackingSession";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { trackPageView } = useTrackingSession();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    trackPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isClean =
    pathname?.startsWith("/proposta") ||
    pathname?.startsWith("/hub") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/briefing") ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/definir-senha") ||
    pathname?.startsWith("/account");

  if (isClean) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </>
  );
}
