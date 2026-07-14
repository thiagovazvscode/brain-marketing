type ClassValue = string | number | null | boolean | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

export function formatWhatsappDigits(value: string): string {
  return value.replace(/\D/g, "");
}
