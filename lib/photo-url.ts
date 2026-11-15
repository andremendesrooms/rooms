/** Only public Supabase Storage URLs configured in next.config.mjs are supported.
 * Never pass test placeholders or unknown remote hosts into next/image.
 */
export function isTrustedPropertyPhotoUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'supabase.co' || url.hostname.endsWith('.supabase.co')) &&
      url.pathname.startsWith('/storage/v1/object/public/') &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}
