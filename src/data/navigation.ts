import type { NavLink, SocialLink } from "@/types";
import { InstagramIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import { siteConfig } from "@/config/site";

export const navLinks: NavLink[] = [
  { label: "Início", href: "#inicio" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Especialidade", href: "#especialidade" },
  { label: "Método", href: "#metodo" },
  { label: "Ecossistema", href: "#ecossistema" },
  { label: "Contato", href: "#contato" },
];

export const footerNavLinks: NavLink[] = [
  { label: "Início", href: "#inicio" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Tráfego pago", href: "#trafego-pago" },
  { label: "Especialidade imobiliária", href: "#especialidade" },
  { label: "Método", href: "#metodo" },
  { label: "Ecossistema", href: "#ecossistema" },
  { label: "Contato", href: "#contato" },
];

export const footerLegalLinks: NavLink[] = [
  { label: "Política de privacidade", href: "/privacy" },
  { label: "Termos de uso", href: "/terms" },
];

export const socialLinks: SocialLink[] = [
  { label: "Instagram", href: siteConfig.social.instagram, icon: InstagramIcon },
  { label: "LinkedIn", href: siteConfig.social.linkedin, icon: LinkedinIcon },
];
