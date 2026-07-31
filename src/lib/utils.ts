type ClassValue = string | number | null | boolean | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

export function formatWhatsappDigits(value: string): string {
  return value.replace(/\D/g, "");
}

const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
