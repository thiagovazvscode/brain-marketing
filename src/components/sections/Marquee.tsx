const words = [
  "Estratégia",
  "Tráfego pago",
  "Posicionamento",
  "Conteúdo",
  "Audiovisual",
  "Tecnologia",
  "Conversão",
  "Vendas",
  "Performance",
  "Mercado imobiliário",
];

export function Marquee() {
  const items = [...words, ...words];

  return (
    <section
      aria-label="Áreas de atuação da Brain"
      className="relative overflow-hidden border-y border-line bg-surface py-6"
    >
      <div className="animate-marquee flex w-max items-center gap-10">
        {items.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className="flex items-center gap-10 whitespace-nowrap"
          >
            <span
              className={
                word === "Mercado imobiliário"
                  ? "font-display text-lg font-medium text-brand-magenta sm:text-xl"
                  : "font-display text-lg font-medium text-muted sm:text-xl"
              }
            >
              {word}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-line" aria-hidden="true" />
          </span>
        ))}
      </div>
    </section>
  );
}
