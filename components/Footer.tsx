import { getTranslator } from "@/lib/i18n-server";
export default async function Footer() {
  const t = await getTranslator();
  return (
    <footer className="mt-16 border-t border-black/5 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-soft">
        <p className="font-mono font-semibold text-ink">ANDRÉ MENDES ROOMS</p>
        <p className="mt-2 max-w-md">
          {t(
            "Imóveis em Londres para a sua próxima fase. Disponibilidade e preços podem mudar — confirme os detalhes diretamente pelo WhatsApp.",
          )}
        </p>
      </div>
    </footer>
  );
}
