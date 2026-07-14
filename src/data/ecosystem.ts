import type { EcosystemNode } from "@/types";
import {
  Megaphone,
  Target,
  ScanSearch,
  Clapperboard,
  LayoutTemplate,
  AppWindow,
  LineChart,
} from "lucide-react";

export const ecosystemNodes: EcosystemNode[] = [
  {
    id: "marketing",
    label: "Marketing",
    description: "Estratégia, posicionamento e direção de comunicação.",
    icon: Megaphone,
  },
  {
    id: "performance",
    label: "Performance",
    description: "Tráfego pago, aquisição e otimização contínua.",
    icon: Target,
  },
  {
    id: "consultoria",
    label: "Consultoria & diagnóstico",
    description: "Leitura da operação e estruturação de processos.",
    icon: ScanSearch,
  },
  {
    id: "audiovisual",
    label: "Audiovisual",
    description: "Vídeo, fotografia e produção para campanhas.",
    icon: Clapperboard,
  },
  {
    id: "sites",
    label: "Sites & landing pages",
    description: "Estruturas digitais conectadas ao processo comercial.",
    icon: LayoutTemplate,
  },
  {
    id: "broker-apps",
    label: "Broker Apps",
    description: "Tecnologia para organizar imóveis, leads e CRM.",
    icon: AppWindow,
  },
  {
    id: "inteligencia-comercial",
    label: "Inteligência comercial",
    description: "Funil, indicadores e integração com vendas.",
    icon: LineChart,
  },
];
