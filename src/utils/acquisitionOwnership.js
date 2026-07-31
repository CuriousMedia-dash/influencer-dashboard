// Stakeholder / claim ownership rules.
//
// - Writing anything in Remark 1 on an unclaimed (or expired-claim) row
//   claims it for the current user — stakeholder name is the part of
//   their login email before the "@".
// - A claim auto-releases if exactly one calendar month has passed
//   since it was claimed AND Convert is still not Yes. This is checked
//   live (on every render) rather than via a background job — nothing
//   in the database actually changes until the user (or someone else)
//   next writes to the row, at which point it's treated as unclaimed.
// - Enforcement here is UI-level only (hide/disable fields for
//   non-owners) — appropriate for an internal team tool, not a hard
//   security boundary against a malicious user bypassing the app.

export function nameFromEmail(email) {
  if (!email) return "";
  return email.split("@")[0];
}

export function isClaimExpired(row) {
  if (!row.claimedAt || row.convert) return false;
  const claimedAt = new Date(row.claimedAt);
  if (Number.isNaN(claimedAt.getTime())) return false;
  const expiresAt = new Date(claimedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return new Date() >= expiresAt;
}

// Claimed = has a stakeholder AND that claim hasn't expired.
export function isClaimed(row) {
  return Boolean(row.stakeholder) && !isClaimExpired(row);
}

export function isOwner(row, userEmail) {
  if (!userEmail) return false;
  return isClaimed(row) && (row.stakeholderEmail || "").toLowerCase() === userEmail.toLowerCase();
}

// Locked = claimed by someone else (and not expired) — the viewer sees
// a blanked-out, uneditable row for everything except the always-visible
// columns (name, subscribers/followers, mail, number, category, stakeholder).
export function isLocked(row, userEmail) {
  return isClaimed(row) && !isOwner(row, userEmail);
}

// Fields that stay visible to everyone regardless of ownership.
export const ALWAYS_VISIBLE_FIELDS = new Set(["name", "profileLink", "subscribers", "email", "phone", "category", "stakeholder"]);
