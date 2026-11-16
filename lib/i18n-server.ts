import { cookies, headers } from "next/headers";
import { parseLanguage, translator } from "./i18n";
export async function getLanguage() {
  if ((await headers()).get("x-rooms-admin") === "true") return "pt" as const;
  return parseLanguage((await cookies()).get("rooms-language")?.value);
}
export async function getTranslator() {
  return translator(await getLanguage());
}
