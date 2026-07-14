// Arquivo central de configuração da marca.
// Substitua os placeholders pelos dados reais da Brain Marketing & Performance
// antes de publicar o site em produção.

export const siteConfig = {
  name: "Brain Marketing & Performance",
  shortName: "Brain",
  description:
    "A Brain conecta estratégia, tráfego pago, posicionamento, audiovisual, tecnologia e inteligência comercial para transformar presença digital em demanda e oportunidades.",
  url: "https://SEU_DOMINIO_AQUI.com.br",
  locale: "pt_BR",

  // Contato — substitua pelos dados reais
  whatsapp: "5591985855801", // formato internacional, apenas números
  whatsappDisplay: "(91) 98585-5801",
  email: "SEU_EMAIL_AQUI@brainmkt.com.br",
  city: "SUA_CIDADE_AQUI, UF",

  // Redes sociais — substitua pelos links reais
  social: {
    instagram: "https://instagram.com/SEU_INSTAGRAM_AQUI",
    linkedin: "https://linkedin.com/company/SEU_LINKEDIN_AQUI",
  },
} as const;

export function getWhatsappLink(message?: string) {
  const base = `https://wa.me/${siteConfig.whatsapp}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const defaultWhatsappMessage =
  "Olá! Vim pelo site e quero solicitar um diagnóstico da Brain.";
