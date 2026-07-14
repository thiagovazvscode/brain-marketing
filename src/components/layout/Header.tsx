"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { navLinks } from "@/data/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { cn } from "@/lib/utils";

function getInitialScrolled(): boolean {
  if (typeof window === "undefined") return false;
  return window.scrollY > 24;
}

export function Header() {
  const [scrolled, setScrolled] = useState(getInitialScrolled);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 24);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line/80 bg-bg/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <a href="#inicio" aria-label="Brain Marketing & Performance — início">
          <Logo width={160} height={48} priority />
        </a>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="#contato" size="md">
            Solicitar diagnóstico
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
