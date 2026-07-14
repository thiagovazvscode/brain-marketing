import Image from "next/image";

const WHATSAPP = "5591985855801";

function wa(msg: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

const BANNERS = [
  {
    src: "/images/hub/banner-incorporadoras.png",
    alt: "Tráfego Pago para Incorporadoras e Lançamentos Imobiliários — Brain Marketing",
    href: wa("Olá! Tenho interesse em tráfego pago para minha incorporadora. Quero saber mais sobre os serviços da Brain Marketing."),
  },
  {
    src: "/images/hub/banner-imobiliarias.png",
    alt: "Tráfego Pago para Imobiliárias que querem gerar mais demanda — Brain Marketing",
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
    alt: "Audiovisual Imobiliário — Drone, Câmera e Edição Profissional — Brain Marketing",
    href: wa("Olá! Tenho interesse nos serviços de audiovisual (drone e câmera profissional) da Brain Marketing. Quero saber mais."),
  },
  {
    src: "/images/hub/banner-brokerapps.png",
    alt: "BrokerApps — Do Lead à Venda, Tudo em Uma Única Plataforma",
    href: "https://brokerapps.com.br",
  },
  {
    src: "/images/hub/banner-diagnostico.png",
    alt: "Diagnóstico Comercial — Identifique os gargalos que estão travando suas vendas — Brain Marketing",
    href: wa("Olá! Quero agendar um diagnóstico comercial com a Brain Marketing."),
  },
];

export default function HubPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4 py-12">

      {/* ── Profile ── */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="relative mb-5">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 blur-sm opacity-70" />
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10">
            <Image
              src="/images/fundador.jpg"
              alt="Thiago Vaz — Brain Marketing & Performance"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <Image src="/images/logo.png" alt="Brain" width={28} height={28} className="rounded-md" />
          <span className="text-sm font-black uppercase tracking-widest text-white/60">Brain Marketing</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Thiago Vaz
          </span>
        </h1>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/55">
          Tráfego pago · Audiovisual · Diagnóstico comercial para o mercado imobiliário
        </p>
      </div>

      {/* ── Banners ── */}
      <div className="w-full space-y-3">
        {BANNERS.map((banner) => (
          <a
            key={banner.src}
            href={banner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block w-full overflow-hidden rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:brightness-105 active:scale-[0.99] active:brightness-95"
          >
            <Image
              src={banner.src}
              alt={banner.alt}
              width={1200}
              height={628}
              className="w-full h-auto"
              sizes="(max-width: 512px) 100vw, 512px"
            />
          </a>
        ))}
      </div>

      {/* ── WhatsApp direto ── */}
      <a
        href={wa("Olá! Vi o link da Brain Marketing e quero saber mais sobre os serviços.")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center gap-2 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 px-6 py-3 text-sm font-bold text-[#25D366] transition hover:bg-[#25D366]/20"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Falar direto no WhatsApp
      </a>

      <p className="mt-10 text-center text-[10px] text-white/20">
        © 2026 Brain Marketing & Performance · brainmktp.com.br
      </p>
    </main>
  );
}
