/** Keeps every photo once, groups manual room labels, and preserves the existing cover. */
export function preserveCoverOrder(
  photos: { id: string; room_group?: string | null }[],
  proposed: string[],
): string[] {
  if (!photos.length) return [];
  const byId = new Map(photos.map((p) => [p.id, p]));
  const unique = [...new Set([...proposed, ...photos.map((p) => p.id)])].filter(
    (id) => byId.has(id),
  );
  const cover = photos[0];
  const ordered = [cover.id, ...unique.filter((id) => id !== cover.id)];
  const groups = new Map<string, string[]>();
  for (const id of ordered) {
    const photo = byId.get(id)!;
    const key = photo.room_group?.trim()
      ? "room:" + photo.room_group.trim()
      : "photo:" + id;
    const group = groups.get(key) ?? [];
    group.push(id);
    groups.set(key, group);
  }
  return [...groups.values()].flat();
}
