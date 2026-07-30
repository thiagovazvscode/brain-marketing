"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BriefingShell } from "@/components/briefing/BriefingShell";
import { BriefingSection } from "@/components/briefing/BriefingSection";
import { TextField, TextAreaField, CheckboxGroup, RadioGroup } from "@/components/briefing/fields";
import { BriefingSummary, type SummarySection } from "@/components/briefing/BriefingSummary";

interface FormState {
  nomeEmpresa: string;
  responsavel: string;
  whatsapp: string;
  site: string;
  tipoImovel: string[];
  faixaValor: string;
  quantidadePortfolio: string;
  cidadesRegioes: string;
  perfilComprador: string[];
  faixaEtaria: string;
  rendaFamiliar: string;
  trafegoPago: string;
  plataformas: string[];
  verbaMensal: string;
  imoveisSimultaneos: string;
  objetivo: string;
  principaisDiferenciais: string;
  lancamentosPrevistos: string;
  informacoesExtras: string;
}

const initialState: FormState = {
  nomeEmpresa: "",
  responsavel: "",
  whatsapp: "",
  site: "",
  tipoImovel: [],
  faixaValor: "",
  quantidadePortfolio: "",
  cidadesRegioes: "",
  perfilComprador: [],
  faixaEtaria: "",
  rendaFamiliar: "",
  trafegoPago: "",
  plataformas: [],
  verbaMensal: "",
  imoveisSimultaneos: "",
  objetivo: "",
  principaisDiferenciais: "",
  lancamentosPrevistos: "",
  informacoesExtras: "",
};

function joinOrDefault(values: string[]) {
  return values.length ? values.join(", ") : "Não informado";
}

function textOrDefault(value: string) {
  const trimmed = value.trim();
  return trimmed || "Não informado";
}

function buildSummarySections(data: FormState): SummarySection[] {
  return [
    {
      title: "Dados da empresa",
      fields: [
        ["Nome da empresa", textOrDefault(data.nomeEmpresa)],
        ["Nome do responsável", textOrDefault(data.responsavel)],
        ["WhatsApp", textOrDefault(data.whatsapp)],
        ["Site", textOrDefault(data.site)],
      ],
    },
    {
      title: "Sobre os imóveis",
      fields: [
        ["Tipo de imóvel", joinOrDefault(data.tipoImovel)],
        ["Faixa de valor", textOrDefault(data.faixaValor)],
        ["Quantidade no portfólio", textOrDefault(data.quantidadePortfolio)],
        ["Cidades e regiões", textOrDefault(data.cidadesRegioes)],
      ],
    },
    {
      title: "Perfil do comprador",
      fields: [
        ["Perfil do comprador ideal", joinOrDefault(data.perfilComprador)],
        ["Faixa etária", textOrDefault(data.faixaEtaria)],
        ["Renda familiar estimada", textOrDefault(data.rendaFamiliar)],
      ],
    },
    {
      title: "Sobre as campanhas",
      fields: [
        ["Tráfego pago anterior", textOrDefault(data.trafegoPago)],
        ["Plataformas desejadas", joinOrDefault(data.plataformas)],
        ["Verba mensal", textOrDefault(data.verbaMensal)],
        ["Imóveis simultâneos", textOrDefault(data.imoveisSimultaneos)],
        ["Objetivo principal", textOrDefault(data.objetivo)],
      ],
    },
    {
      title: "Diferenciais e lançamentos",
      fields: [
        ["Principais diferenciais", textOrDefault(data.principaisDiferenciais)],
        ["Lançamentos previstos", textOrDefault(data.lancamentosPrevistos)],
        ["Informações extras", textOrDefault(data.informacoesExtras)],
      ],
    },
  ];
}

function buildSummaryText(sections: SummarySection[], timestampFormatted: string) {
  const lines = [`BRIEFING — MV IMÓVEIS`, `Preenchido em: ${timestampFormatted}`, ""];
  for (const section of sections) {
    lines.push(section.title.toUpperCase());
    for (const [label, value] of section.fields) {
      lines.push(`${label}: ${value}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export default function BriefingMvImoveisPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitted, setSubmitted] = useState<{
    sections: SummarySection[];
    summaryText: string;
    timestampFormatted: string;
    blob: Blob;
    fileName: string;
  } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const now = new Date();
    const timestamp = now.toISOString();
    const timestampFormatted = now.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
    const sections = buildSummarySections(form);
    const summaryText = buildSummaryText(sections, timestampFormatted);

    const payload = { client: "mv-imoveis", timestamp, timestampFormatted, ...form };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const fileName = `briefing-mv-imoveis-${timestamp.replace(/[:.]/g, "-")}.json`;

    triggerDownload(blob, fileName);
    setSubmitted({ sections, summaryText, timestampFormatted, blob, fileName });

    // Fire-and-forget: cai na ficha do cliente no admin. Nunca deve travar o envio
    // local (JSON + resumo) mesmo se o endpoint ainda não existir ou o banco estiver fora do ar.
    fetch("/api/briefings/mv-imoveis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    }).catch(() => {});
  }

  function handleReset() {
    setForm(initialState);
    setSubmitted(null);
  }

  return (
    <BriefingShell
      badgeLabel="Briefing Interno · MV Imóveis"
      title="Briefing de Tráfego Pago"
      subtitle="Preencha antes da reunião com a MV Imóveis. As respostas ajudam a alinhar estratégia, segmentação e criativos."
    >
      {submitted ? (
        <BriefingSummary
          timestampFormatted={submitted.timestampFormatted}
          sections={submitted.sections}
          summaryText={submitted.summaryText}
          onDownloadAgain={() => triggerDownload(submitted.blob, submitted.fileName)}
          onReset={handleReset}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <BriefingSection step={1} title="Dados da empresa">
            <TextField
              label="Nome da empresa"
              value={form.nomeEmpresa}
              onChange={(v) => update("nomeEmpresa", v)}
              required
            />
            <TextField
              label="Nome do responsável"
              value={form.responsavel}
              onChange={(v) => update("responsavel", v)}
              required
            />
            <TextField
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(v) => update("whatsapp", v)}
              placeholder="(00) 00000-0000"
              required
            />
            <TextField label="Site" value={form.site} onChange={(v) => update("site", v)} placeholder="www.exemplo.com.br" />
          </BriefingSection>

          <BriefingSection step={2} title="Sobre os imóveis" delay={0.04}>
            <CheckboxGroup
              label="Tipo de imóvel"
              options={["Residencial alto padrão", "Loteamento", "Apartamento", "Comercial/Galpão", "Terreno", "Outro"]}
              values={form.tipoImovel}
              onChange={(v) => update("tipoImovel", v)}
            />
            <TextField
              label="Faixa de valor dos imóveis"
              value={form.faixaValor}
              onChange={(v) => update("faixaValor", v)}
              placeholder="Ex: R$ 300 mil a R$ 800 mil"
            />
            <TextField
              label="Quantidade de imóveis no portfólio"
              value={form.quantidadePortfolio}
              onChange={(v) => update("quantidadePortfolio", v)}
            />
            <TextField
              label="Cidades e regiões de atuação"
              value={form.cidadesRegioes}
              onChange={(v) => update("cidadesRegioes", v)}
            />
          </BriefingSection>

          <BriefingSection step={3} title="Perfil do comprador" delay={0.08}>
            <CheckboxGroup
              label="Perfil do comprador ideal"
              options={["Família classe média", "Família alto padrão", "Investidor", "Empresário", "Jovem casal", "Aposentado"]}
              values={form.perfilComprador}
              onChange={(v) => update("perfilComprador", v)}
            />
            <TextField
              label="Faixa etária"
              value={form.faixaEtaria}
              onChange={(v) => update("faixaEtaria", v)}
              placeholder="Ex: 30 a 50 anos"
            />
            <TextField label="Renda familiar estimada" value={form.rendaFamiliar} onChange={(v) => update("rendaFamiliar", v)} />
          </BriefingSection>

          <BriefingSection step={4} title="Sobre as campanhas" delay={0.12}>
            <RadioGroup
              label="Já fez tráfego pago antes?"
              name="trafegoPago"
              options={["Sim, com bons resultados", "Sim, sem resultado", "Nunca fez"]}
              value={form.trafegoPago}
              onChange={(v) => update("trafegoPago", v)}
            />
            <CheckboxGroup
              label="Plataformas desejadas"
              options={["Facebook e Instagram", "Google Ads", "YouTube", "TikTok"]}
              values={form.plataformas}
              onChange={(v) => update("plataformas", v)}
            />
            <TextField
              label="Verba mensal disponível para mídia"
              value={form.verbaMensal}
              onChange={(v) => update("verbaMensal", v)}
              placeholder="Ex: R$ 3.000"
            />
            <TextField
              label="Quantos imóveis anunciar simultaneamente"
              value={form.imoveisSimultaneos}
              onChange={(v) => update("imoveisSimultaneos", v)}
            />
            <RadioGroup
              label="Objetivo principal"
              name="objetivo"
              options={["Gerar leads pelo formulário", "Gerar conversas no WhatsApp", "Os dois"]}
              value={form.objetivo}
              onChange={(v) => update("objetivo", v)}
            />
          </BriefingSection>

          <BriefingSection step={5} title="Diferenciais e lançamentos" delay={0.16}>
            <TextAreaField
              label="Principais diferenciais dos imóveis"
              value={form.principaisDiferenciais}
              onChange={(v) => update("principaisDiferenciais", v)}
            />
            <TextAreaField
              label="Lançamentos previstos"
              value={form.lancamentosPrevistos}
              onChange={(v) => update("lancamentosPrevistos", v)}
            />
            <TextAreaField
              label="Informações extras"
              value={form.informacoesExtras}
              onChange={(v) => update("informacoesExtras", v)}
            />
          </BriefingSection>

          <div className="mt-8 text-center">
            <Button type="submit" size="lg" icon={Send} iconPosition="right">
              Enviar briefing
            </Button>
          </div>
        </form>
      )}
    </BriefingShell>
  );
}
