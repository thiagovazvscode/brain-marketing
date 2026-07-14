import type { Service } from "@/types";
import {
  Target,
  Compass,
  LayoutTemplate,
  Clapperboard,
  LineChart,
  Workflow,
} from "lucide-react";

export const services: Service[] = [
  {
    id: "trafego-pago",
    number: "01",
    title: "Tráfego pago e aquisição",
    description:
      "Meta Ads e Google Ads planejados para gerar demanda constante, com segmentação, criativos e páginas conectados ao atendimento e à venda.",
    bullets: [
      "Meta Ads e Google Ads",
      "Geração de leads e campanhas de vendas",
      "Remarketing e segmentação avançada",
      "Análise de dados e otimização contínua",
    ],
    icon: Target,
    size: "lg",
    href: "#trafego-pago",
  },
  {
    id: "posicionamento",
    number: "02",
    title: "Posicionamento",
    description:
      "Direção de comunicação e construção de autoridade para organizar como sua marca é percebida antes de qualquer campanha rodar.",
    bullets: [
      "Estratégia de posicionamento",
      "Direção criativa",
      "Conteúdo estratégico",
    ],
    icon: Compass,
    size: "md",
    href: "#solucoes",
  },
  {
    id: "sites-landing-pages",
    number: "03",
    title: "Sites e landing pages",
    description:
      "Estruturas digitais de alta conversão para campanhas, institucionais, corretores e imobiliárias — conectadas ao processo comercial.",
    bullets: [
      "Landing pages de alta conversão",
      "Sites institucionais e para corretores",
      "Páginas para campanhas específicas",
    ],
    icon: LayoutTemplate,
    size: "md",
    href: "#solucoes",
  },
  {
    id: "audiovisual",
    number: "04",
    title: "Audiovisual",
    description:
      "Produção de vídeo e fotografia para campanhas, empreendimentos e imóveis de médio e alto padrão, com direção especializada.",
    bullets: [
      "Vídeos comerciais e institucionais",
      "Fotografia e captação com drone",
      "Conteúdo para redes e campanhas",
    ],
    icon: Clapperboard,
    size: "sm",
    href: "#audiovisual",
  },
  {
    id: "inteligencia-comercial",
    number: "05",
    title: "Inteligência comercial",
    description:
      "Diagnóstico da operação, organização de funil e integração entre marketing e vendas para que nenhum lead se perca no caminho.",
    bullets: [
      "Diagnóstico comercial e de marketing",
      "Estruturação de processos e funil",
      "Estratégia de atendimento",
    ],
    icon: LineChart,
    size: "sm",
    href: "#metodo",
  },
  {
    id: "tecnologia",
    number: "06",
    title: "Tecnologia",
    description:
      "Ecossistema tecnológico com o Broker Apps para organizar imóveis, leads, CRM, funil e indicadores em um só lugar.",
    bullets: [
      "Broker Apps para o mercado imobiliário",
      "Organização de CRM e funil",
      "Indicadores e processos",
    ],
    icon: Workflow,
    size: "md",
    href: "#ecossistema",
  },
];
