import { methodSteps } from "@/data/method";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionReveal } from "@/components/ui/MotionReveal";

export function Method() {
  return (
    <section id="metodo" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Método"
          title="Entendemos o negócio antes de ligar qualquer campanha."
          description="A metodologia da Brain existe para evitar o erro mais comum do mercado: investir em anúncios sem estrutura por trás. Cinco etapas conectam diagnóstico, direção e execução."
        />

        <ol className="relative mt-20 flex flex-col">
          <span className="absolute bottom-0 left-6 top-0 hidden w-px bg-gradient-to-b from-brand-primary/60 via-brand-primary/30 to-transparent sm:block" aria-hidden="true" />

          {methodSteps.map((step, index) => (
            <MotionReveal key={step.id} delay={index * 0.08}>
              <li className="relative flex flex-col gap-5 border-b border-line py-8 first:pt-0 last:border-b-0 sm:flex-row sm:items-start sm:gap-8 sm:py-10">
                <div className="flex items-center gap-5 sm:w-40 sm:shrink-0">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-primary/40 bg-bg text-brand-primary">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl text-line sm:hidden">
                    {step.index}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display hidden text-2xl text-muted/50 sm:inline">
                      {step.index}
                    </span>
                    <h3 className="font-display text-xl font-medium text-ink md:text-2xl">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                    {step.description}
                  </p>
                </div>
              </li>
            </MotionReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
