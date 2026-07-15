"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════
   QUIZ CHATBOT
══════════════════════════════════════════════════ */

const WHATSAPP_NUM = "5591985855801";
function wa(msg: string) {
  return `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(msg)}`;
}

type Step = { q: string; opts: string[] };

const STEPS: Step[] = [
  {
    q: "Qual é o seu principal objetivo agora?",
    opts: [
      "Atrair mais clientes com anúncios pagos",
      "Produção visual com drone e câmera profissional",
      "Organizar vendas com CRM e inteligência artificial",
      "Descobrir onde estou perdendo vendas",
    ],
  },
  {
    q: "Como você se define no mercado imobiliário?",
    opts: [
      "Corretor autônomo",
      "Tenho uma imobiliária",
      "Incorporadora ou lançamentos",
      "Outro tipo de empresa",
    ],
  },
  {
    q: "Como está sua captação de clientes hoje?",
    opts: [
      "Dependo quase só de indicações",
      "Já anuncio, mas os resultados são fracos",
      "Anuncio e quero escalar mais",
      "Não tenho processo definido",
    ],
  },
  {
    q: "Você tem gestão de leads organizada?",
    opts: [
      "Não — uso só WhatsApp e planilha",
      "Tenho uma ferramenta, mas é complicado",
      "Sim, mas quero algo mais completo",
    ],
  },
  {
    q: "O que seria uma vitória para você em 90 dias?",
    opts: [
      "Leads qualificados chegando todo dia",
      "Vídeos e fotos profissionais dos meus imóveis",
      "Processo de vendas organizado e escalável",
      "Saber exatamente onde perco clientes",
    ],
  },
];

type Result = { icon: string; title: string; desc: string; href: string };

function calcResult(answers: number[]): Result {
  const [q1, q2] = answers;

  if (q1 === 1)
    return {
      icon: "🎬",
      title: "Audiovisual Imobiliário",
      desc: "Drone, câmera e edição profissional para valorizar seus imóveis e fortalecer sua apresentação comercial.",
      href: wa("Olá! Fiz o quiz no site e o resultado indicou Audiovisual. Quero saber mais sobre drone e câmera profissional."),
    };

  if (q1 === 2)
    return {
      icon: "🤖",
      title: "BrokerApps — CRM com IA",
      desc: "Plataforma com SDR, CRM kanban, vitrine digital e dashboard do Meta Ads integrado para organizar sua operação.",
      href: "https://brokerapps.com.br",
    };

  if (q1 === 3)
    return {
      icon: "🩺",
      title: "Diagnóstico Comercial",
      desc: "Analisamos sua operação de marketing, atendimento e conversão para mostrar onde estão os gargalos.",
      href: wa("Olá! Fiz o quiz no site e o resultado indicou Diagnóstico Comercial. Quero agendar meu diagnóstico."),
    };

  // Q1 = 0 → Tráfego Pago, refinado pelo Q2
  const niches = ["Corretores", "Imobiliárias", "Incorporadoras", "Empresas"];
  const msgs = [
    "Olá! Fiz o quiz no site — sou corretor autônomo e preciso de tráfego pago. Quero saber mais.",
    "Olá! Fiz o quiz no site — tenho uma imobiliária e preciso de tráfego pago. Quero saber mais.",
    "Olá! Fiz o quiz no site — tenho uma incorporadora e preciso de tráfego pago. Quero saber mais.",
    "Olá! Fiz o quiz no site — tenho uma empresa e preciso de tráfego pago. Quero saber mais.",
  ];
  return {
    icon: "📈",
    title: `Tráfego Pago · ${niches[q2] ?? "Imóveis"}`,
    desc: "Campanhas no Meta Ads e Google Ads para gerar leads qualificados e atrair compradores para o seu negócio.",
    href: wa(msgs[q2] ?? msgs[0]),
  };
}

function QuizModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [animating, setAnimating] = useState(false);

  function choose(idx: number) {
    if (animating) return;
    const next = [...answers, idx];
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      if (step + 1 >= STEPS.length) {
        setResult(calcResult(next));
      } else {
        setAnswers(next);
        setStep((s) => s + 1);
      }
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="quiz-slide-up w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header chat */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-pink-600 px-5 py-4">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/30">
            <Image src="/images/fundador.webp" alt="Thiago Vaz" fill className="object-cover object-top" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white">Thiago Vaz vai te ajudar 🧠</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Responde e eu te indico o melhor caminho
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="bg-[#f5f0ff] px-5 pb-6 pt-5">
          {!result ? (
            <>
              {/* Progresso */}
              <div className="mb-4 flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-fuchsia-500" : "bg-fuchsia-200"}`} />
                ))}
              </div>

              {/* Balão pergunta */}
              <div className={`mb-4 transition-all duration-300 ${animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                <div className="inline-block rounded-2xl rounded-tl-none bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold leading-snug text-white shadow">
                  {STEPS[step].q}
                </div>
              </div>

              {/* Opções */}
              <div className={`space-y-2 transition-all duration-300 ${animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                {STEPS[step].opts.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    className="w-full rounded-2xl border border-fuchsia-100 bg-white px-4 py-3.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-fuchsia-400 hover:bg-fuchsia-50 hover:text-fuchsia-700 active:scale-[0.98]"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Resultado */
            <div className="text-center">
              <div className="mb-3 text-5xl">{result.icon}</div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-fuchsia-500">Indicação personalizada</p>
              <h3 className="mb-3 text-xl font-black text-slate-900">{result.title}</h3>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">{result.desc}</p>
              <a
                href={result.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-sm font-black text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90 active:scale-[0.98]"
              >
                Quero conhecer →
              </a>
              <button
                onClick={() => { setStep(0); setAnswers([]); setResult(null); }}
                className="mt-3 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
              >
                Refazer o quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".sr");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0) scale(1)";
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const BANNERS: { src: string; alt: string; href: string; glow?: "green" | "purple" }[] = [
  {
    src: "/images/hub/banner-incorporadoras.png",
    alt: "Tráfego Pago para Incorporadoras — Brain Marketing",
    href: wa("Olá! Tenho interesse em tráfego pago para minha incorporadora. Quero saber mais sobre os serviços da Brain Marketing."),
  },
  {
    src: "/images/hub/banner-imobiliarias.png",
    alt: "Tráfego Pago para Imobiliárias — Brain Marketing",
    href: wa("Olá! Tenho interesse em tráfego pago para minha imobiliária. Quero saber mais sobre os serviços da Brain Marketing."),
  },
  {
    src: "/images/hub/banner-corretores.png",
    alt: "Tráfego Pago para Corretores Autônomos — Brain Marketing",
    href: wa("Olá! Sou corretor autônomo e tenho interesse em tráfego pago. Quero saber mais sobre os serviços da Brain Marketing."),
  },
  {
    src: "/images/hub/banner-empresas.png",
    alt: "Tráfego Pago para Empresas — Brain Marketing",
    href: wa("Olá! Tenho interesse em tráfego pago para minha empresa. Quero saber mais sobre os serviços da Brain Marketing."),
  },
  {
    src: "/images/hub/banner-audiovisual.png",
    alt: "Audiovisual Imobiliário — Drone e Câmera Profissional — Brain Marketing",
    href: wa("Olá! Tenho interesse nos serviços de audiovisual da Brain Marketing. Quero saber mais."),
  },
  {
    src: "/images/hub/banner-brokerapps.png",
    alt: "BrokerApps — Do Lead à Venda, Tudo em Uma Única Plataforma",
    href: "https://brokerapps.com.br",
    glow: "green",
  },
  {
    src: "/images/hub/banner-diagnostico.png",
    alt: "Diagnóstico Comercial — Brain Marketing",
    href: wa("Olá! Quero agendar um diagnóstico comercial com a Brain Marketing."),
  },
];

export default function HubPage() {
  useScrollReveal();
  const [quizOpen, setQuizOpen] = useState(false);
  return (
    <>
      {quizOpen && <QuizModal onClose={() => setQuizOpen(false)} />}
      <style>{`
        /* ── Hand click animation ── */
        @keyframes hand-click {
          0%   { transform: translateY(0) rotate(0deg) scale(1); }
          35%  { transform: translateY(6px) rotate(-8deg) scale(0.88); }
          55%  { transform: translateY(3px) rotate(-4deg) scale(0.92); }
          75%  { transform: translateY(-4px) rotate(4deg) scale(1.08); }
          100% { transform: translateY(0) rotate(0deg) scale(1); }
        }
        .hand-anim {
          display: inline-block;
          animation: hand-click 1.6s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(217,70,239,.7));
        }

        /* ── Green glow pulse (BrokerApps) ── */
        @keyframes glow-green {
          0%, 100% { box-shadow: 0 0 18px 2px rgba(74,222,128,.35), 0 0 50px 6px rgba(74,222,128,.12); }
          50%       { box-shadow: 0 0 32px 6px rgba(74,222,128,.65), 0 0 80px 16px rgba(74,222,128,.22); }
        }
        .glow-green {
          animation: glow-green 2.2s ease-in-out infinite;
          border-radius: 16px;
        }

        /* ── Shimmer sweep on hover ── */
        .banner-link { position: relative; overflow: hidden; }
        .banner-link::before {
          content: '';
          position: absolute;
          top: 0; left: -120%;
          width: 60%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,.10), transparent);
          transform: skewX(-20deg);
          transition: none;
          pointer-events: none;
          z-index: 10;
        }
        .banner-link:hover::before {
          left: 160%;
          transition: left .6s ease;
        }

        /* ── Zoom on hover ── */
        .banner-link img {
          transition: transform .35s cubic-bezier(.4,0,.2,1), filter .35s ease;
        }
        .banner-link:hover img {
          transform: scale(1.03);
          filter: brightness(1.06);
        }

        /* ── Hero blob ── */
        @keyframes blob-drift {
          0%, 100% { transform: translate(-50%, -30%) scale(1); }
          50%       { transform: translate(-50%, -20%) scale(1.08); }
        }
        .hero-blob { animation: blob-drift 8s ease-in-out infinite; }

        /* ── Quiz slide up ── */
        @keyframes quiz-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .quiz-slide-up { animation: quiz-up .38s cubic-bezier(.4,0,.2,1) both; }

        /* ── Scroll reveal ── */
        .sr {
          opacity: 0;
          transform: translateY(36px) scale(0.97);
          transition: opacity .55s cubic-bezier(.4,0,.2,1), transform .55s cubic-bezier(.4,0,.2,1);
        }

        /* ── Hero itens entram ao carregar ── */
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-in { animation: fade-up .7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>

      <main className="min-h-screen bg-[#050510] text-white">

        {/* ══════════════ HERO ══════════════ */}
        <section className="relative overflow-hidden pb-14 pt-16 text-center">

          {/* Blobs de fundo */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="hero-blob absolute left-1/2 top-0 h-[560px] w-[560px] rounded-full opacity-25"
              style={{ background: "radial-gradient(ellipse, #7C3AED 0%, transparent 68%)" }}
            />
            <div
              className="absolute left-1/2 top-16 h-[320px] w-[320px] -translate-x-1/4 rounded-full opacity-15"
              style={{ background: "radial-gradient(ellipse, #D946EF 0%, transparent 68%)" }}
            />
            {/* Grid sutil */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="gr" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M48 0L0 0 0 48" fill="none" stroke="#a855f7" strokeWidth="0.8"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gr)"/>
            </svg>
          </div>

          <div className="relative mx-auto max-w-md px-4">
            {/* Logo grande acima da foto */}
            <div className="hero-in mx-auto mb-4 flex justify-center" style={{ animationDelay: "0ms" }}>
              <Image src="/images/logo.png" alt="Brain Marketing & Performance" width={90} height={90} className="rounded-2xl" />
            </div>

            {/* Foto com anel gradiente */}
            <div className="hero-in relative mx-auto mb-6 h-28 w-28" style={{ animationDelay: "120ms" }}>
              <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 opacity-90 blur-[2px]" />
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/10">
                <Image
                  src="/images/fundador.webp"
                  alt="Thiago Vaz — Brain Marketing & Performance"
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>

            {/* Label removida — logo já identifica a marca */}
            <div className="hidden">
            </div>

            {/* Nome */}
            <h1 className="hero-in mb-3 text-[2rem] font-black leading-none tracking-tight" style={{ animationDelay: "220ms" }}>
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Thiago Vaz
              </span>
            </h1>

            {/* Tagline */}
            <p className="hero-in mx-auto max-w-[280px] text-sm leading-relaxed text-white/45" style={{ animationDelay: "320ms" }}>
              Tráfego pago · Audiovisual · Diagnóstico comercial<br />
              <span className="text-white/30">para o mercado imobiliário</span>
            </p>

            {/* Divisor */}
            <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent" />
          </div>
        </section>

        {/* ══════════════ BANNERS ══════════════ */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-2xl">

            {/* ── Quiz trigger ── */}
            <button
              onClick={() => setQuizOpen(true)}
              className="sr mb-6 block w-full cursor-pointer rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-violet-900/60 via-fuchsia-900/50 to-violet-900/60 px-5 py-4 text-left backdrop-blur-sm transition hover:border-fuchsia-400/60 hover:from-violet-800/70 hover:via-fuchsia-800/60 hover:to-violet-800/70 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-fuchsia-400/40">
                  <Image src="/images/fundador.webp" alt="Thiago Vaz" fill className="object-cover object-top" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">Não sabe por onde começar? 🤔</p>
                  <p className="mt-0.5 text-xs text-white/50">Responde 5 perguntas rápidas — eu te indico o melhor serviço</p>
                </div>
                <div className="shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 p-2 shadow-lg shadow-fuchsia-500/30">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Indicador mãozinha */}
            <div className="mb-5 flex flex-col items-center gap-1.5 text-white/35">
              <span className="hand-anim text-4xl">👇</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]">Toque para conhecer</p>
            </div>

            {/* Stack de banners */}
            <div className="space-y-3">
              {BANNERS.map((banner, i) => (
                <a
                  key={banner.src}
                  href={banner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ transitionDelay: `${i * 60}ms` }}
                  className={`sr banner-link block w-full cursor-pointer overflow-hidden rounded-2xl active:scale-[0.985] ${banner.glow === "green" ? "glow-green" : ""}`}
                >
                  <Image
                    src={banner.src}
                    alt={banner.alt}
                    width={1200}
                    height={628}
                    className="w-full h-auto block"
                    sizes="(max-width: 672px) 100vw, 672px"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ WHATSAPP + FOOTER ══════════════ */}
        <div className="pb-14 text-center">
          <a
            href={wa("Olá! Vi o link da Brain Marketing e quero saber mais sobre os serviços.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/10 px-6 py-3 text-sm font-bold text-[#25D366] transition hover:bg-[#25D366]/20"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar direto no WhatsApp
          </a>

          <p className="mt-8 text-[10px] text-white/15">
            © 2026 Brain Marketing & Performance · brainmktp.com.br
          </p>
        </div>

      </main>
    </>
  );
}
