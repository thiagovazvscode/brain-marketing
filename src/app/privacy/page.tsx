import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Política de privacidade da ${siteConfig.name}.`,
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-32 lg:px-10">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-magenta">
        Legal
      </p>
      <h1 className="font-display mt-4 text-3xl font-medium text-ink sm:text-4xl">
        Política de Privacidade
      </h1>
      <p className="mt-4 text-sm text-muted">Última atualização: 10 de julho de 2026</p>

      <div className="mt-12 space-y-10 text-sm leading-relaxed text-ink/80 md:text-base">
        <section>
          <h2 className="font-display text-xl font-medium text-ink">1. Informações que coletamos</h2>
          <p className="mt-3">
            Ao preencher o formulário de contato deste site, a {siteConfig.name}{" "}
            coleta os dados fornecidos voluntariamente, como nome, empresa,
            segmento, WhatsApp, e-mail, serviço de interesse, faixa de
            investimento e mensagem. Também podemos coletar dados de
            navegação por meio de ferramentas de análise de tráfego.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">2. Como usamos as informações</h2>
          <p className="mt-3">
            Os dados coletados são utilizados exclusivamente para responder
            solicitações de diagnóstico, apresentar propostas comerciais e
            manter contato relacionado aos serviços da {siteConfig.name}.
            Não vendemos nem compartilhamos seus dados com terceiros para
            fins de marketing sem o seu consentimento.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">3. Cookies e tecnologias de análise</h2>
          <p className="mt-3">
            Este site pode utilizar cookies e pixels de rastreamento (como
            Meta Pixel e Google Tag) para mensurar a performance de
            campanhas de tráfego pago e melhorar a experiência de
            navegação.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">4. Seus direitos</h2>
          <p className="mt-3">
            Você pode solicitar, a qualquer momento, a confirmação,
            correção, anonimização ou exclusão dos seus dados pessoais,
            entrando em contato pelo e-mail {siteConfig.email}.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium text-ink">5. Contato</h2>
          <p className="mt-3">
            Em caso de dúvidas sobre esta política, entre em contato pelo
            e-mail {siteConfig.email} ou pelos canais indicados no rodapé
            deste site.
          </p>
        </section>
      </div>
    </article>
  );
}
