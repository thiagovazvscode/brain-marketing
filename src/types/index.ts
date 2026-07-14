import type { ComponentType, SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export type ServiceSize = "lg" | "md" | "sm";

export interface Service {
  id: string;
  number: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  size: ServiceSize;
  href: string;
}

export interface MethodStep {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface EcosystemNode {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface CaseSlot {
  id: string;
  status: string;
  segment: string;
}

export type ServiceInterest =
  | "trafego-pago"
  | "posicionamento"
  | "landing-page-site"
  | "audiovisual"
  | "consultoria"
  | "mercado-imobiliario"
  | "broker-apps"
  | "outro";

export type InvestmentRange =
  | "ate-2000"
  | "2000-5000"
  | "5000-10000"
  | "acima-10000"
  | "nao-definido";

export interface ContactFormData {
  name: string;
  company: string;
  segment: string;
  whatsapp: string;
  email: string;
  service: ServiceInterest | "";
  investment: InvestmentRange | "";
  message: string;
}

export type FormStatus = "idle" | "submitting" | "success" | "error";
