/** Galeria organizada por AMBIENTE: nenhum ambiente identificado reaparece
 *  depois que o visitante passa para outro. IDs únicos; nenhuma foto apagada.
 *  Etiquetas de ambiente são a fonte confiável; sem etiqueta não é possível
 *  garantir que duas fotos mostrem o mesmo cômodo.
 */
export function normalizeRoomGroup(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR') || '';
  return normalized || null;
}

export function roomGroupSummary(
  photos: { id: string; room_group?: string | null }[],
) {
  const unknown = photos.filter(p => !normalizeRoomGroup(p.room_group));
  const groups = new Set(photos.map(p => normalizeRoomGroup(p.room_group))
    .filter((tag): tag is string => tag !== null));
  return { untagged: unknown.length, groups: groups.size, total: photos.length };
}

/** Uma única passagem por cômodo; mantém a capa escolhida manualmente,
 *  enquanto todas as fotos do mesmo ambiente aparecem juntas.
 *  Fotos sem ambiente identificado permanecem no fim (não há como prometer
 *  que não são fotos de um quarto que já foi exibido).
 */
export function preserveCoverOrder(
  photos: { id: string; room_group?: string | null }[],
  proposed: string[],
): string[] {
  if (!photos.length) return [];
  const byId = new Map(photos.map(p => [p.id, p]));
  const unique = [...new Set([...proposed, ...photos.map(p => p.id)])]
    .filter(id => byId.has(id));

  const cover = photos[0];
  const proposedWithCover = [cover.id, ...unique.filter(id => id !== cover.id)];
  const groups = new Map<string, string[]>();
  const unlabeled: string[] = [];

  for (const id of proposedWithCover) {
    const group = normalizeRoomGroup(byId.get(id)?.room_group);
    if (!group) {
      unlabeled.push(id);
      continue;
    }
    const ids = groups.get(group) || [];
    ids.push(id);
    groups.set(group, ids);
  }
  // Se a capa foi etiquetada, seu bloco é exibido primeiro. Nunca intercale
  // outro grupo nem volte a um ambiente previamente apresentado.
  return [...groups.values()].flat().concat(unlabeled);
}
