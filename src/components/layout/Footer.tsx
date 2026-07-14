import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { services } from "@/data/services";
import { footerNavLinks, footerLegalLinks, socialLinks } from "@/data/navigation";
import { siteConfig, getWhatsappLink, defaultWhatsappMessage } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo width={120} height={36} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              Agência de marketing e performance para empresas que querem
              crescer, com especialidade profunda no mercado imobiliário.
            </p>
            <ul className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand-primary/60 hover:text-brand-primary"
                  >
                    <social.icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Navegação do rodapé">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Navegação
            </h3>
            <ul className="mt-5 space-y-3">
              {footerNavLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-ink/80 transition-colors hover:text-brand-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Serviços">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Serviços
            </h3>
            <ul className="mt-5 space-y-3">
              {services.map((service) => (
                <li key={service.id}>
                  <a
                    href={service.href}
                    className="text-sm text-ink/80 transition-colors hover:text-brand-primary"
                  >
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Contato
            </h3>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href={getWhatsappLink(defaultWhatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-ink/80 transition-colors hover:text-brand-primary"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="inline-flex items-center gap-2 text-sm text-ink/80 transition-colors hover:text-brand-primary"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {siteConfig.email}
                </a>
              </li>
              <li className="text-sm text-muted">{siteConfig.city}</li>
              <li>
                <a
                  href="#contato"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-magenta transition-colors hover:text-brand-primary"
                >
                  Solicitar diagnóstico
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {year} {siteConfig.name}. Todos os direitos reservados.
          </p>
          <ul className="flex items-center gap-6">
            {footerLegalLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-xs text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
