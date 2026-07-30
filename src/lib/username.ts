// Shared username rules (client + server safe).

export const USERNAME_RE = /^[A-Za-z0-9_.]{4,20}$/;

const RESERVED = new Set([
  "admin", "administrator", "root", "system", "support", "help", "moderator",
  "ingenious", "academy", "official", "staff", "teacher", "headmaster", "lumi",
  "null", "undefined", "me", "you", "owner", "master",
]);

const BLOCKED_FRAGMENTS = [
  "fuck", "shit", "bitch", "bastard", "asshole", "cunt", "dick", "porn",
  "sex", "rape", "nigga", "nigger", "slut", "whore", "randi", "chutiya", "madarchod", "bhosdi",
];

export type UsernameCheck = { ok: boolean; reason?: string };

export function validateUsername(raw: string): UsernameCheck {
  const value = (raw ?? "").trim();
  if (value.length < 4) return { ok: false, reason: "Minimum 4 characters" };
  if (value.length > 20) return { ok: false, reason: "Maximum 20 characters" };
  if (!USERNAME_RE.test(value)) {
    return { ok: false, reason: "Only letters, numbers, underscore and period" };
  }
  const lower = value.toLowerCase();
  if (RESERVED.has(lower)) return { ok: false, reason: "This username is reserved" };
  if (BLOCKED_FRAGMENTS.some((f) => lower.includes(f))) {
    return { ok: false, reason: "This username is not allowed" };
  }
  return { ok: true };
}

export function suggestUsername(name: string) {
  const base = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  const padded = base.length >= 4 ? base : `${base}_cadet`.slice(0, 16);
  return `${padded}${Math.floor(Math.random() * 900 + 100)}`.slice(0, 20);
}

export const USERNAME_COOLDOWN_DAYS = 30;

export function daysUntilUsernameChange(changedAt: string | null | undefined) {
  if (!changedAt) return 0;
  const next = new Date(changedAt).getTime() + USERNAME_COOLDOWN_DAYS * 86400000;
  return Math.max(0, Math.ceil((next - Date.now()) / 86400000));
}
