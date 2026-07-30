const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted";
const inputClass =
  "w-full rounded-lg border border-line bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand-primary focus:outline-none";
const optionClass =
  "flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-bg/40 px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-brand-primary/50";

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({ label, required, children }: FieldWrapperProps) {
  return (
    <div className="mb-4 last:mb-0">
      <label className={labelClass}>
        {label} {required && <span className="text-brand-magenta">*</span>}
      </label>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <FieldWrapper label={label} required={required}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
    </FieldWrapper>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <FieldWrapper label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={`${inputClass} resize-y`}
      />
    </FieldWrapper>
  );
}

export function CheckboxGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((v) => v !== option));
    } else {
      onChange([...values, option]);
    }
  }

  return (
    <FieldWrapper label={label}>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className={optionClass}>
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => toggle(option)}
              className="h-4 w-4 shrink-0 accent-[#2563eb]"
            />
            {option}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldWrapper label={label}>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className={optionClass}>
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 shrink-0 accent-[#2563eb]"
            />
            {option}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}
