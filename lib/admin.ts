const DEFAULT_ADMIN_EMAILS = ['admin@laperhemat.app'];

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return DEFAULT_ADMIN_EMAILS;

  const list = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return list.length > 0 ? list : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
