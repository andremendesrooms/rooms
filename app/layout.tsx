import { getLanguage } from "@/lib/i18n-server";
import { LanguageProvider } from "@/components/LanguageProvider";
import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = (await import("@/lib/i18n-server")).getTranslator;
  const translate = await t();
  return {
    title: `André Mendes Rooms — ${translate("Imóveis em Londres")}`,
    icons: { icon: "/brand/andre-mendes-icon.svg" },
    description: translate(
      "Catálogo de imóveis em Londres para quem quer mudar ou está planejando chegar, com informações claras e contato direto.",
    ),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={(await getLanguage()) === "pt" ? "pt-BR" : await getLanguage()}>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} bg-paper font-sans text-ink`}
      >
        <LanguageProvider language={await getLanguage()}>
          <Header />
          {process.env.NEXT_PUBLIC_PREVIEW_VISUAL_MODE === "1" && (
            <aside role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-950">
              PRÉVIA DE TESTE — Amostra de 23 registros extraídos do catálogo de 18/11/2026. Preços e disponibilidade não confirmados. Sem fotos e sem reservas. Não é o site oficial.
            </aside>
          )}
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
