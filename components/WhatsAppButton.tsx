"use client";

import { useTranslation } from "./LanguageProvider";
import { whatsappLink } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export default function WhatsAppButton({
  propertyId,
  title,
  className,
  children,
}: {
  propertyId: string;
  title?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslation();
  const href = whatsappLink(propertyId, title, t);
  if (!href)
    return (
      <span role="status" className="text-sm text-slate-soft">
        {t("WhatsApp indisponível no momento. Tente novamente mais tarde.")}
      </span>
    );
  function handleClick() {
    const params = new URLSearchParams(window.location.search);
    // Best-effort: registra o clique para o funil de origem de lead (seção
    // "ORIGEM DO LEAD" da arquitetura). Nunca bloqueia a navegação do usuário
    // se a inserção falhar — WhatsApp abre de qualquer jeito.
    void supabase.from("analytics_events").insert({
      event_type: "whatsapp_click",
      property_id: propertyId,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-full bg-route-green px-5 py-3 font-semibold text-white transition hover:bg-route-green/90"
      }
    >
      {children}
    </a>
  );
}
