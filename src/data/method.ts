import type { MethodStep } from "@/types";
import { ScanSearch, Compass, Layers, Rocket, TrendingUp } from "lucide-react";

export const methodSteps: MethodStep[] = [
  {
    id: "raio-x",
    index: "01",
    title: "Raio-X",
    description:
      "Diagnóstico comercial e de marketing. Entendemos operação, funil, oferta e concorrência antes de sugerir qualquer ação.",
    icon: ScanSearch,
  },
  {
    id: "direcao",
    index: "02",
    title: "Direção",
    description:
      "Posicionamento, comunicação e prioridades definidas com clareza. Toda campanha nasce de uma direção, não do improviso.",
    icon: Compass,
  },
  {
    id: "estrutura",
    index: "03",
    title: "Estrutura",
    description:
      "Construção de sites, páginas, criativos e conteúdo — a base que sustenta a aquisição antes de ligar os anúncios.",
    icon: Layers,
  },
  {
    id: "motor-de-aquisicao",
    index: "04",
    title: "Motor de aquisição",
    description:
      "Tráfego pago, segmentação e campanhas conectadas ao atendimento, gerando demanda real e rastreável.",
    icon: Rocket,
  },
  {
    id: "curva-de-otimizacao",
    index: "05",
    title: "Curva de otimização",
    description:
      "Leitura de dados, ajustes contínuos e evolução do que já está no ar — performance é processo, não evento único.",
    icon: TrendingUp,
  },
];
