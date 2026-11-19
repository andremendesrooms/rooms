export type PublicationRecord = {
  status: string;
  hidden: boolean;
  validation_status: string;
  pending_price: number | null;
  price: number | null;
  postcode: string | null;
  type: string;
  available_from: string | null;
};

// "archive" is a reversible removal from the working catalog, not a SQL DELETE.
// "restore" always returns to a hidden inactive draft (never republishes).
export type PublicationAction = "hide" | "rent" | "publish" | "archive" | "restore";

export function publicationChange(
  record: PublicationRecord,
  action: PublicationAction,
  verified: boolean,
) {
  if (action === "archive") {
    if (record.status === "archived")
      throw new Error("Este imóvel já está arquivado.");
    return { status: "archived", hidden: true };
  }

  if (action === "restore") {
    if (record.status !== "archived")
      throw new Error("Somente imóveis arquivados podem ser restaurados.");
    return { status: "inactive", hidden: true };
  }

  if (record.status === "archived") {
    throw new Error("Restaure o imóvel arquivado antes de alterar sua publicação.");
  }

  if (action === "hide") return { hidden: true };
  if (action === "rent") return { status: "rented", hidden: true };
  if (action !== "publish") throw new Error("Ação inválida.");

  if (!verified)
    throw new Error(
      "Confirme que o anúncio é real e foi verificado com a fonte comercial.",
    );
  if (record.validation_status !== "ok")
    throw new Error(
      "A validação precisa estar aprovada (ok). Este painel não aprova validações automaticamente.",
    );
  if (record.pending_price !== null)
    throw new Error("Resolva a revisão de preço antes de publicar.");
  if (
    !record.price ||
    !Number.isFinite(record.price) ||
    record.price <= 0 ||
    !record.postcode ||
    !record.type ||
    !record.available_from
  )
    throw new Error("Confira preço, postcode, tipo e data antes de publicar.");
  return { status: "available", hidden: false };
}
