"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isProposta = pathname?.startsWith("/proposta");

  if (isProposta) {
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
