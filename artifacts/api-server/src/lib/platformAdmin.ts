// Platform admins may publish templates for every team. Identity, not a shared secret:
// the account's e-mail must be verified and listed in PLATFORM_ADMIN_EMAILS (comma separated).
export function adminEmails(env = process.env.PLATFORM_ADMIN_EMAILS): Set<string> {
  return new Set((env ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export function isAdminUser(
  user: { email: string | null; emailVerified: boolean } | undefined | null,
  admins = adminEmails(),
): boolean {
  return !!user?.emailVerified && !!user.email && admins.has(user.email.toLowerCase());
}

const UMLAUTS: Record<string, string> = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" };

/** URL-safe template key from a German title, at most 60 chars. */
export function slugify(title: string): string {
  const slug = title.toLowerCase().replace(/[äöüß]/g, (c) => UMLAUTS[c]).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return slug || "vorlage";
}
