"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isClean =
    pathname?.startsWith("/proposta") ||
    pathname?.startsWith("/hub") ||
    pathname?.startsWith("/admin");

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
