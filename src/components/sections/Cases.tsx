"use client";

import { motion } from "framer-motion";
import { caseSlots } from "@/data/cases";

export function Cases() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-magenta/20 px-4 py-2 text-xs text-brand-magenta">
            <span aria-hidden="true">●</span> CASES
          </span>

          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Projetos em andamento, prontos para serem publicados com autorização do cliente.
          </h2>

          <p className="mt-6 text-base leading-relaxed text-gray-400 sm:text-lg">
            A Brain não expõe resultados sem validação. Os primeiros cases
            documentados estão sendo finalizados — com problema, estratégia e
            resultado reais.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/30">
            {caseSlots.flatMap((slot, index) => {
              const items = [
                <span key={slot.id}>
                  {slot.segment} — {slot.status}
                </span>,
              ];
              if (index < caseSlots.length - 1) {
                items.push(
                  <span key={`${slot.id}-sep`} aria-hidden="true">
                    ·
                  </span>
                );
              }
              return items;
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
