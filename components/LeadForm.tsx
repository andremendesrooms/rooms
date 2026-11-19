"use client";
import ArrowIcon from "@/components/ArrowIcon";
import { useTranslation } from "@/components/LanguageProvider";
import { useState } from "react";
export default function LeadForm() {
  const t = useTranslation();
  const [error, setError] = useState("");
  return (
    <form
      className="grid grid-cols-2 gap-4 rounded-3xl border border-black/10 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
        if (!number || !/^\d{8,15}$/.test(number)) {
          setError(
            t("WhatsApp indisponível no momento. Tente novamente mais tarde."),
          );
          return;
        }
        const data = new FormData(e.currentTarget);
        const fieldLabels: Record<string, string> = {
          "Máximo em GBP": "Orçamento máximo (£)",
          "Período do orçamento": "Período",
          Data: "Data da mudança",
          "Já mora em Londres": "Já mora em Londres?",
        };
        const message = Array.from(data.entries())
          .filter(([key]) => key !== "consent")
          .map(([key, value]) => `${t(fieldLabels[key] || key)}: ${value}`)
          .join("\n");
        const previewPrefix = process.env.NEXT_PUBLIC_PREVIEW_VISUAL_MODE === "1"
          ? "[TESTE DA PRÉVIA — NÃO É UMA SOLICITAÇÃO DE RESERVA]\n" : "";
        window.open(
          `https://wa.me/${number}?text=${encodeURIComponent(previewPrefix + t("Olá! Estou procurando um imóvel.") + "\n" + message)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }}
    >
      {["Tipo de imóvel", "Região"].map((label) => (
        <label key={label} className="text-sm">
          {t(label)}
          <input
            name={label}
            required
            maxLength={100}
            className="field mt-2 w-full"
          />
        </label>
      ))}
      <label className="text-sm">
        {t("Ocupantes")}
        <input
          name="Ocupantes"
          required
          type="number"
          min="1"
          max="20"
          className="field mt-2 w-full"
        />
      </label>
      <label className="text-sm">
        {t("Orçamento máximo (£)")}
        <input
          name="Máximo em GBP"
          required
          type="number"
          min="1"
          className="field mt-2 w-full"
        />
      </label>
      <label className="text-sm">
        {t("Período")}
        <select name="Período do orçamento" className="field mt-2 w-full">
          <option>{t("Por semana")}</option>
          <option>{t("Por mês")}</option>
        </select>
      </label>
      <label className="text-sm">
        {t("Data da mudança")}
        <input name="Data" required type="date" className="field mt-2 w-full" />
      </label>
      <label className="col-span-2 text-sm">
        {t("Já mora em Londres?")}
        <select name="Já mora em Londres" className="field mt-2 w-full">
          <option>{t("Sim")}</option>
          <option>{t("Não")}</option>
        </select>
      </label>
      <label className="col-span-2 flex items-start gap-3 text-sm text-slate-soft">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 shrink-0"
        />
        {t(
          "Concordo em enviar estas preferências à equipe pelo WhatsApp para atendimento. Este formulário não armazena dados no site.",
        )}
      </label>
      <button className="col-span-2 rounded-full bg-route-gold p-3 font-semibold text-white">
        {t("Enviar preferências pelo WhatsApp ↗").replace(" ↗", "")}
        <ArrowIcon />
      </button>
      {error && (
        <p role="alert" className="col-span-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
