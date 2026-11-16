import catalog from "./translations.json";
export const languages = ["pt", "en", "es", "it", "fr", "pl"] as const;
export type Language = (typeof languages)[number];
export function parseLanguage(value: unknown): Language {
  return languages.includes(value as Language) ? (value as Language) : "pt";
}
export function translator(language: Language) {
  return (text: string) =>
    (catalog as Record<string, Record<Language, string>>)[text]?.[language] ??
    text;
}
