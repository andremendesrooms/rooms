"use client";
import { useState } from "react";
import { adminSupabase } from "@/lib/supabase-admin";
import {
  publicationChange,
  type PublicationRecord,
  type PublicationAction,
} from "@/lib/publication";
type Record = PublicationRecord & { id: string; updated_at: string };
export default function PublicationControls({
  record,
  onSaved,
}: {
  record: Record;
  onSaved: () => void;
}) {
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(action: PublicationAction) {
    if (busy) return;
    setError("");
    let patch: ReturnType<typeof publicationChange>;
    try {
      patch = publicationChange(record, action, verified);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (
      !window.confirm(
        action === "publish"
          ? "Publicar este anúncio real no catálogo agora?"
          : "Confirmar a retirada deste anúncio do catálogo?",
      )
    )
      return;
    setBusy(true);
    try {
      const { data: identity, error: authError } =
        await adminSupabase.auth.getUser();
      if (authError || !identity.user)
        throw new Error("A sessão expirou. Entre novamente.");
      const { data: member, error: roleError } = await adminSupabase
        .from("admin_users")
        .select("role")
        .eq("id", identity.user.id)
        .eq("active", true)
        .maybeSingle();
      if (
        roleError ||
        !member ||
        !["manager", "super_admin"].includes(member.role)
      )
        throw new Error("Seu perfil não pode alterar a publicação.");
      // RLS and database audit/price triggers remain mandatory; no elevated key is used.
      const { data, error: writeError } = await adminSupabase
        .from("properties")
        .update(patch)
        .eq("id", record.id)
        .eq("updated_at", record.updated_at)
        .eq("status", record.status)
        .eq("hidden", record.hidden)
        .eq("validation_status", record.validation_status)
        .select("id")
        .maybeSingle();
      if (writeError)
        throw new Error(
          "Não foi possível alterar a publicação. Confira suas permissões.",
        );
      if (!data)
        throw new Error(
          "O registro mudou em outra sessão. Reabra o imóvel antes de tentar novamente.",
        );
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha de conexão. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-xl font-semibold">Publicação e disponibilidade</h2>
      <p className="mt-2 text-sm text-slate-soft">
        Salve as alterações do formulário antes de alterar a publicação. Nenhuma
        ação exclui o imóvel ou suas fotos.
      </p>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        Conferi com a fonte comercial: anúncio real, disponibilidade, fotos e
        valores corretos. Não é imóvel fictício de teste.
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            busy ||
            !verified ||
            record.validation_status !== "ok" ||
            record.pending_price !== null
          }
          onClick={() => change("publish")}
          className="rounded-lg bg-route-green px-4 py-3 text-white disabled:opacity-50"
        >
          Publicar / mostrar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => change("hide")}
          className="rounded-lg border px-4 py-3"
        >
          Ocultar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => change("rent")}
          className="rounded-lg border px-4 py-3"
        >
          Marcar como alugado
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
