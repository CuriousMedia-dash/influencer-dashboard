import { primaryLink } from "./format";

// No-backend "share" links: the campaign snapshot is JSON-encoded, then
// Base64-URL-encoded, and travels entirely inside the link itself. Whoever
// opens the link decodes it client-side — there's no server call, no
// database, nothing to expire. The link's un-guessability *is* the access
// control.
//
// NOTE on the brand dashboard specifically: fields the brand fills in on
// their side (reimbursement cost, their own "locked" toggle) are saved to
// *their* browser's localStorage, keyed by this token — there is no
// backend yet, so those edits do not sync back to the agency's copy of
// the app. Re-sharing (regenerating & resending the link) always reflects
// the agency's latest data; it just won't carry forward anything the
// brand entered on the previous link.

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toUrlSafe(b64) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(safe) {
  const b64 = safe.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return b64 + pad;
}

/**
 * Builds the brand-dashboard token: campaign-level fields (client, budget,
 * timeline, POC, links expected) plus one row per creator↔campaign link
 * with the fields the brand dashboard shows (name, profile link,
 * followers, locked cost, counter cost, final cost, remark, agency lock
 * status, execution stage, live video link, viewership).
 */
export function buildShareToken(campaign, getCreatorById) {
  const rows = campaign.creatorLinks.map((link) => {
    const creator = getCreatorById(link.creatorId);
    return {
      creatorId: link.creatorId,
      n: creator?.name || "Unknown creator",
      link: creator ? primaryLink(creator) : "",
      f: creator?.followers ?? 0,
      lp: link.lockedCost || null,
      cc: link.counterCost || null,
      fc: link.finalCost || null,
      remark: link.remark || "",
      lockStatus: link.lockStatus || "unlocked",
      executionStage: link.executionStage || "Draft Video",
      liveLink: link.liveLink || "",
      viewership: link.viewership || "",
    };
  });

  const payload = {
    v: 2,
    name: campaign.name,
    client: campaign.client || "",
    budget: campaign.budget || 0,
    timelineStart: campaign.timelineStart || "",
    timelineEnd: campaign.timelineEnd || "",
    poc: campaign.poc || campaign.owner || "",
    linksExpected: campaign.linksExpected || "",
    generatedAt: new Date().toISOString(),
    rows,
  };

  return toUrlSafe(utf8ToBase64(JSON.stringify(payload)));
}

/**
 * Decodes a share token back into the payload object above.
 * Returns null if the token is missing, corrupt, or tampered with.
 */
export function decodeShareToken(token) {
  if (!token) return null;
  try {
    const json = base64ToUtf8(fromUrlSafe(token));
    const payload = JSON.parse(json);
    if (!payload || !Array.isArray(payload.rows)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildShareUrl(campaign, getCreatorById) {
  const token = buildShareToken(campaign, getCreatorById);
  return `${window.location.origin}/brand/${token}`;
}

/**
 * The live Brand Dashboard link — just the campaign's own id. Unlike the
 * old snapshot-in-the-link approach above, this always shows current data
 * (fetched live from the database via a scoped, anonymous-safe function),
 * and both the brand and the agency can edit through it.
 */
export function buildBrandDashboardUrl(campaignId) {
  return `${window.location.origin}/brand/${campaignId}`;
}