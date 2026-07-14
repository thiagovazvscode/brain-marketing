"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { navLinks } from "@/data/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-bg lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
        >
          <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_10%,transparent_75%)]" />

          <div className="relative flex h-full flex-col px-6 pb-8 pt-6">
            <div className="flex items-center justify-between">
              <Logo width={140} height={42} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar menu"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-brand-primary/60"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-14 flex flex-1 flex-col justify-center" aria-label="Navegação principal">
              <ul className="space-y-2">
                {navLinks.map((link, index) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <a
                      href={link.href}
                      onClick={onClose}
                      className="flex items-center justify-between border-b border-line py-4 font-display text-3xl text-ink transition-colors hover:text-brand-primary"
                    >
                      {link.label}
                      <ArrowUpRight className="h-6 w-6 text-muted" aria-hidden="true" />
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Button href="#contato" onClick={onClose} className="w-full" size="lg">
                Solicitar diagnóstico
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
