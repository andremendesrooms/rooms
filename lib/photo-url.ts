/** Only the configured project's public property-images bucket is allowed. */
export function isTrustedPropertyPhotoUrl(value: unknown): value is string {
  if (typeof value !== "string" || !process.env.NEXT_PUBLIC_SUPABASE_URL)
    return false;
  try {
    const url = new URL(value);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    return (
      url.protocol === "https:" &&
      url.origin === project.origin &&
      url.pathname.startsWith(
        "/storage/v1/object/public/property-images/properties/",
      ) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
