import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: `Termos de uso do site da ${siteConfig.name}.`,
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-32 lg:px-10">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-magenta">
        Legal
      </p>
      <h1 className="font-display mt-4 text-3xl font-medium text-ink sm:text-4xl">
        Termos de Uso
      </h1>
      <p className="mt-4 text-sm text-muted">Última atualização: 10 de julho de 2026</p>

      <div className="mt-12 space-y-10 text-sm leading-relaxed text-ink/80 md:text-base">
        <section>
          <h2 className="font-display text-xl font-medium text-ink">1. Aceitação dos termos</h2>
          <p className="mt-3">
            Ao acessar e utilizar este site, você concorda com os termos
            descritos nesta página. Caso não concorde, recomendamos que
            não utilize o site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">2. Sobre o conteúdo</h2>
          <p className="mt-3">
            As informações apresentadas neste site têm caráter comercial e
            institucional sobre os serviços da {siteConfig.name}. Cases,
            imagens e vídeos identificados como &ldquo;em construção&rdquo;
            ou &ldquo;em publicação&rdquo; serão atualizados conforme
            autorização dos respectivos clientes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">3. Propriedade intelectual</h2>
          <p className="mt-3">
            Textos, identidade visual, elementos gráficos e demais
            conteúdos deste site pertencem à {siteConfig.name} e não podem
            ser reproduzidos sem autorização prévia.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">4. Formulário e propostas</h2>
          <p className="mt-3">
            O envio do formulário de contato não implica contratação
            automática de serviços. Todo diagnóstico e proposta comercial
            são apresentados após análise individual de cada solicitação.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">5. Alterações</h2>
          <p className="mt-3">
            Estes termos podem ser atualizados periodicamente. Recomendamos
            revisar esta página com regularidade.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">6. Contato</h2>
          <p className="mt-3">
            Dúvidas sobre estes termos podem ser enviadas para{" "}
            {siteConfig.email}.
          </p>
        </section>
      </div>
    </article>
  );
}
