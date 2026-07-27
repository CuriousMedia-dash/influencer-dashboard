// CSV import parser for creator data exported from Google Sheets.
// Handles: K/M formatted followers, phone normalisation for dedup,
// strict row-level validation with per-row error reporting.

import { parseN, normaliseName } from "./format";

// Canonical column name mapping — case-insensitive, trims whitespace.
// Maps whatever header name the sheet uses → internal field name.
const HEADER_MAP = {
  name: "name",
  creator: "name",
  "creator name": "name",

  platform: "platform",

  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  "mobile number": "phone",
  contact: "phone",
  "contact no": "phone",
  "contact number": "phone",

  email: "email",
  "email address": "email",
  "email id": "email",

  gender: "gender",

  niche: "category",
  category: "category",
  "content category": "category",

  language: "language",
  lang: "language",

  city: "city",
  "creator city": "city",
  location: "city",

  followers: "followers",
  "follower count": "followers",
  "followers count": "followers",
  subscriber: "followers",
  subscribers: "followers",

  link: "profileLink",
  "profile link": "profileLink",
  "channel link": "profileLink",
  instagram: "profileLink",
  "creator link": "profileLink",
  url: "profileLink",

  commercial: "commercial",
  commerical: "commercial",
  rate: "commercial",
  "commercial rate": "commercial",
  "commercials": "commercial",
  price: "commercial",
  cost: "commercial",
  charges: "commercial",
};

// Multi-platform columns — one link column per platform, e.g.
// "Instagram Link", "YouTube Link", "Twitter Link", "LinkedIn Link".
// Header key here is the already-normalised (lowercase, letters+spaces
// only) header text; value is the canonical platform name from PLATFORMS.
const PLATFORM_LINK_HEADER_MAP = {
  "instagram link": "Instagram",
  instagram: "Instagram",
  "youtube link": "YouTube",
  youtube: "YouTube",
  "twitter link": "Twitter",
  twitter: "Twitter",
  "x link": "Twitter",
  "linkedin link": "LinkedIn",
  linkedin: "LinkedIn",
};

// The only column that truly must be present for a row to mean anything.
// Followers is NOT required — a blank or unparseable Followers cell no
// longer drops the row; it's imported with followers = 0 instead. No
// creator should ever be silently excluded just because one column
// (followers, city, language, etc.) is empty for them.
const REQUIRED_FIELDS = ["name"];

function normaliseHeaderCell(h) {
  return String(h ?? "").trim().toLowerCase().replace(/[^a-z ]/g, "").trim();
}

/**
 * Real-world files often have a title, an instructions row, a blank
 * spacer row, or a logo/legend above the actual header row — not just a
 * clean header on line 1. Rather than assume row 1 is always the header,
 * scan the first several lines and use whichever one actually contains
 * a Name-like column (and, preferably, a Followers-like one too — but a
 * sheet that genuinely has no follower counts yet shouldn't fail to
 * import over that). Falls back to line 0 if nothing matches at all, so
 * the existing "missing required columns" error still fires with a
 * sensible message instead of silently misbehaving.
 */
function findHeaderRowIndex(lines) {
  const maxScan = Math.min(lines.length, 15);
  let nameOnlyFallback = null;
  for (let i = 0; i < maxScan; i++) {
    const cells = parseCsvLine(lines[i]).map(normaliseHeaderCell);
    const hasName = cells.some((c) => HEADER_MAP[c] === "name");
    const hasFollowers = cells.some((c) => HEADER_MAP[c] === "followers");
    if (hasName && hasFollowers) return i;
    if (hasName && nameOnlyFallback === null) nameOnlyFallback = i;
  }
  return nameOnlyFallback !== null ? nameOnlyFallback : 0;
}

// Normalise a phone number to digits-only for dedup comparison.
// "+91 70003 38800" → "917000338800"
export function normalisePhone(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

// Normalise a profile link for matching — strips protocol, "www.", and
// a trailing slash, so "https://instagram.com/foo/" and
// "http://www.instagram.com/foo" are recognised as the same link.
export function normaliseLink(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/+$/, "");
}

// Real-world sheets are full of placeholder text in the link column —
// "N/A", "-", "TBD", "pending", "updating", a stray space — and none of
// that is an actual profile link. Treating it as one is dangerous: every
// row that happens to share the same placeholder text would collapse
// into a single "duplicate" and silently overwrite each other. A string
// only counts as a real link if it actually has a domain with a dot in
// it (e.g. "instagram.com"), same as a browser would require.
function isPlausibleLink(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const { hostname } = new URL(withScheme);
    return hostname.includes(".") && hostname.length > 3;
  } catch {
    return false;
  }
}

// A creator is matched purely by their platform link — two rows with the
// same (normalised) profile link on the same platform are the same
// creator entry, full stop. Name/phone are no longer part of the match:
// a sheet can update someone's name or phone number and the row is still
// recognised as the same person, and it never gets fooled into merging
// two different people who happen to share a phone number.
export function linkMatchKey(row) {
  if (!isPlausibleLink(row.profileLink)) return null;
  const link = normaliseLink(row.profileLink);
  if (!link) return null;
  const platform = (row.platform || "").trim().toLowerCase();
  return `link|${link}|${platform}`;
}

/**
 * Parse a raw CSV string into structured creator rows.
 *
 * Returns:
 *   { rows: [...], errors: [...] }
 *
 * If errors is non-empty the caller should surface them to the user and
 * NOT import anything — the user needs to fix their file first.
 *
 * Each error is: { rowNum, name, message }
 * Each row is a partial creator object ready for merging into context.
 */
export function parseCsvImport(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ rowNum: null, name: null, message: "File appears to be empty or has no data rows." }],
    };
  }

  // Find the real header row — not necessarily line 0 (see
  // findHeaderRowIndex above for why), then parse it, handling quoted
  // fields too.
  const headerRowIndex = findHeaderRowIndex(lines);
  const headers = parseCsvLine(lines[headerRowIndex]).map(normaliseHeaderCell);

  // Map header index → internal field name.
  const fieldIndex = {}; // { fieldName: colIndex }
  const platformColIndex = {}; // { "Instagram": colIndex, ... }
  headers.forEach((h, i) => {
    const mapped = HEADER_MAP[h];
    if (mapped && !(mapped in fieldIndex)) {
      fieldIndex[mapped] = i;
    }
    const platMapped = PLATFORM_LINK_HEADER_MAP[h];
    if (platMapped && !(platMapped in platformColIndex)) {
      platformColIndex[platMapped] = i;
    }
  });
  const hasPlatformColumns = Object.keys(platformColIndex).length > 0;

  // Check that at minimum the Name column exists.
  const missingCols = REQUIRED_FIELDS.filter((f) => !(f in fieldIndex));
  if (missingCols.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNum: headerRowIndex + 1,
          name: null,
          message: `Required column(s) not found in CSV header: ${missingCols.join(", ")}. 
Found headers: ${headers.join(", ")}`,
        },
      ],
    };
  }

  const rows = [];
  const errors = [];

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-based
    const cols = parseCsvLine(lines[i]);

    // Google Sheets exports pad the sheet out to its full row/column range,
    // so trailing "rows" are often just a string of commas with no real
    // content (",,,,,,,,,"). That's not a data-entry mistake — skip it
    // silently rather than flagging it as an error.
    const isBlankRow = cols.every((c) => !c || !c.trim());
    if (isBlankRow) continue;

    const get = (field) =>
      fieldIndex[field] !== undefined
        ? (cols[fieldIndex[field]] ?? "").trim()
        : "";

    const name = get("name");
    const followersRaw = get("followers");
    // A blank or unparseable Followers cell is never a reason to drop
    // the row — parseN already returns 0 for anything it can't read, so
    // the creator still gets imported with everything else that WAS
    // filled in, just with followers = 0 for now.
    const followers = parseN(followersRaw);

    const rowErrors = [];

    if (!name) {
      rowErrors.push("Name is empty");
    }

    if (rowErrors.length > 0) {
      errors.push({
        rowNum,
        name: name || "(no name)",
        message: rowErrors.join("; "),
      });
      continue;
    }

    // Build one row per platform. If the sheet has per-platform link
    // columns (Instagram Link / YouTube Link / ...), emit one standalone
    // creator row for each non-empty column — a creator on Instagram +
    // YouTube becomes 2 separate rows, sharing name/phone/email but each
    // with its own platform + link. Otherwise fall back to the legacy
    // single Platform + Link column pair (one row).
    let platformEntries = [];
    if (hasPlatformColumns) {
      Object.entries(platformColIndex).forEach(([platName, colIdx]) => {
        const link = (cols[colIdx] ?? "").trim();
        if (link) platformEntries.push({ platform: platName, link });
      });
    }
    if (platformEntries.length === 0) {
      platformEntries = [
        { platform: get("platform") || "Instagram", link: get("profileLink") },
      ];
    }

    const shared = {
      name,
      phone: get("phone"),
      email: get("email"),
      gender: get("gender") || "Others",
      category: get("category") || "Entertainment",
      language: get("language") || "Hindi",
      city: get("city"),
      followers,
      avgViews: Math.round(followers * 0.08),
      commercial: get("commercial"),
      remark: "",
    };

    platformEntries.forEach(({ platform, link }) => {
      rows.push({
        ...shared,
        platform,
        profileLink: link,
      });
    });
  }

  return { rows, errors };
}

/**
 * Build the dedup key for a row — the row's platform link, normalised,
 * is the duplicate constraint: two rows with the same link on the same
 * platform are the same entry, and re-saving one updates the other in
 * place rather than creating a new row. The same person on Instagram AND
 * YouTube still stays as 2 separate entries, since each has its own link.
 *
 * A row with no link at all (rare — only possible when a sheet has no
 * link column for that platform) falls back to name + phone + platform,
 * just so it still gets a stable, non-colliding key instead of every
 * linkless row landing on the same key and overwriting each other.
 */
export function dedupeKey(row) {
  const link = isPlausibleLink(row.profileLink) ? normaliseLink(row.profileLink) : "";
  const platform = (row.platform || "").trim().toLowerCase();
  if (link) return `link|${link}|${platform}`;
  const normPhone = normalisePhone(row.phone);
  const normName = normaliseName(row.name);
  return `nolink|${normName}|${normPhone}|${platform}`;
}

/**
 * Merge imported rows into the existing creators array.
 * Dedup rule: skip if the same platform link already exists.
 * Sort result alphabetically by name (case-insensitive).
 *
 * Returns: { merged: [...creators], added: number, skipped: number }
 */
export function mergeCreators(existing, incoming) {
  const existingKeys = new Set(existing.map(dedupeKey));

  let added = 0;
  let skipped = 0;
  let nextId = Date.now(); // unique enough for in-memory ids

  const newOnes = [];
  for (const row of incoming) {
    const key = dedupeKey(row);

    // Skip if the same platform link already exists.
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Register this key so we don't add the same entry twice within the
    // same import batch either.
    existingKeys.add(key);

    newOnes.push({
      id: "imp_" + nextId++,
      ...row,
    });
    added++;
  }

  const merged = [...existing, ...newOnes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return { merged, added, skipped };
}

/**
 * Sync imported rows into the existing creators array.
 * Unlike mergeCreators (which always skips a duplicate platform link),
 * this matches rows to existing creators by that same platform link and
 * *updates* the existing record's fields in place when a match is found
 * — so a re-uploaded/re-synced row with the same link always overwrites
 * the old values with whatever's new, rather than creating a second row.
 * Rows with no match (a link never seen before) are appended as new
 * creators. Used for the "live sheet link" flow, where the whole point is
 * that edits made in the sheet should flow through.
 *
 * When `mirror` is true, this treats the sheet as the full source of
 * truth: any existing creator that isn't matched by *any* incoming row is
 * removed from the result. This is how deletions made in the sheet
 * propagate into the app. Leave it false to only ever add/update (never
 * delete) — the safer default.
 *
 * Returns: { merged: [...creators], added: number, updated: number, removed: number }
 */
export function syncCreators(existing, incoming, { mirror = false } = {}) {
  // Single lookup index, keyed purely by platform link — the only
  // duplicate constraint now. A row with no link at all can never match
  // an existing creator, so it's always added as new (see dedupeKey's
  // fallback for how it still gets a stable key of its own).
  const linkIndex = new Map();
  existing.forEach((c, i) => {
    const lk = linkMatchKey(c);
    if (lk && !linkIndex.has(lk)) linkIndex.set(lk, i);
  });

  const result = [...existing];
  const matchedIdx = new Set();
  const addedKeys = [];
  let added = 0;
  let updated = 0;
  let nextId = Date.now();

  for (const row of incoming) {
    const lk = linkMatchKey(row);
    const matchIdx = lk !== null ? linkIndex.get(lk) : undefined;

    if (matchIdx !== undefined) {
      // Same link as an existing row — treat as the same creator and
      // overwrite its fields with the new values, keeping its id.
      result[matchIdx] = {
        ...result[matchIdx],
        ...row,
      };
      matchedIdx.add(matchIdx);
      updated++;

      // Re-index under the (possibly changed) link, so a later row in
      // this same batch can still find this creator correctly too.
      const newLk = linkMatchKey(result[matchIdx]);
      if (newLk) linkIndex.set(newLk, matchIdx);
    } else {
      const newCreator = { id: "sync_" + nextId++, ...row };
      result.push(newCreator);
      const newIdx = result.length - 1;
      matchedIdx.add(newIdx);
      if (lk) linkIndex.set(lk, newIdx);
      added++;
      addedKeys.push(dedupeKey(row));
    }
  }

  let finalResult = result;
  let removed = 0;
  if (mirror) {
    finalResult = result.filter((_, i) => matchedIdx.has(i));
    removed = result.length - finalResult.length;
  }

  const merged = finalResult.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return { merged, added, updated, removed, addedKeys };
}

// ---------------------------------------------------------------------------
// Internal: minimal CSV line parser (handles quoted fields with commas/newlines)
// ---------------------------------------------------------------------------
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}