"use client";

// Switch acessível (role=switch) — usado no lugar dos checkboxes do
// Construtor Visual (etapa/bloco). Só troca a aparência do controle; o
// valor booleano por trás é o mesmo de sempre.
export function Switch({
  checked,
  onChange,
  label,
  helpText,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  helpText?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-os-ink">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-accent ${
            checked ? "bg-os-accent" : "bg-os-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {helpText && <p className="mt-1 text-[11px] leading-snug text-os-muted">{helpText}</p>}
    </div>
  );
}
