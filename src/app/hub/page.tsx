import Image from "next/image";

const WHATSAPP = "5591985855801";

function wa(msg: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

const LINKS = [
  {
    icon: "📈",
    tag: "Tráfego Pago",
    title: "Incorporadoras",
    desc: "Meta Ads e Google Ads para lançamentos imobiliários",
    gradient: "from-violet-600/30 to-fuchsia-600/20",
    border: "border-violet-500/30",
    tagColor: "text-violet-400",
    msg: "Olá! Tenho interesse em tráfego pago para minha incorporadora. Quero saber mais sobre os serviços da Brain Marketing.",
  },
  {
    icon: "🏢",
    tag: "Tráfego Pago",
    title: "Imobiliárias",
    desc: "Geração de leads qualificados para equipes de corretores",
    gradient: "from-fuchsia-600/30 to-pink-600/20",
    border: "border-fuchsia-500/30",
    tagColor: "text-fuchsia-400",
    msg: "Olá! Tenho interesse em tráfego pago para minha imobiliária. Quero saber mais sobre os serviços da Brain Marketing.",
  },
  {
    icon: "🔑",
    tag: "Tráfego Pago",
    title: "Corretores Autônomos",
    desc: "Anúncios no Meta Ads para corretores que vendem mais",
    gradient: "from-pink-600/30 to-rose-600/20",
    border: "border-pink-500/30",
    tagColor: "text-pink-400",
    msg: "Olá! Sou corretor autônomo e tenho interesse em tráfego pago. Quero saber mais sobre os serviços da Brain Marketing.",
  },
  {
    icon: "🎬",
    tag: "Audiovisual",
    title: "Drone & Câmera Profissional",
    desc: "Filmagens aéreas e vídeos comerciais para seus empreendimentos",
    gradient: "from-sky-600/30 to-violet-600/20",
    border: "border-sky-500/30",
    tagColor: "text-sky-400",
    msg: "Olá! Tenho interesse nos serviços de audiovisual (drone e câmera profissional) da Brain Marketing. Quero saber mais.",
  },
  {
    icon: "🩺",
    tag: "Gratuito",
    title: "Diagnóstico Comercial",
    desc: "Analisamos sua operação de marketing e apontamos os gargalos",
    gradient: "from-emerald-600/30 to-teal-600/20",
    border: "border-emerald-500/30",
    tagColor: "text-emerald-400",
    msg: "Olá! Quero agendar um diagnóstico comercial gratuito com a Brain Marketing.",
  },
];

export default function HubPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-4 py-12">

      {/* ── Profile ── */}
      <div className="mb-10 flex flex-col items-center text-center">
        {/* Avatar com anel gradiente */}
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

        {/* Logo + nome */}
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
        {LINKS.map((link) => (
          <a
            key={link.title}
            href={wa(link.msg)}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-4 rounded-2xl border bg-gradient-to-r ${link.gradient} ${link.border} px-5 py-4 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]`}
          >
            {/* Ícone */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
              {link.icon}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest ${link.tagColor}`}>
                {link.tag}
              </p>
              <p className="text-base font-black text-white">{link.title}</p>
              <p className="mt-0.5 truncate text-xs text-white/50">{link.desc}</p>
            </div>

            {/* Seta */}
            <svg
              className="h-5 w-5 shrink-0 text-white/30 transition group-hover:text-white/70 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
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

      {/* ── Footer ── */}
      <p className="mt-10 text-center text-[10px] text-white/20">
        © 2026 Brain Marketing & Performance · brainmktp.com.br
      </p>
    </main>
  );
}
