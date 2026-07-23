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

// Fields that must be present and non-empty for a row to be valid.
const REQUIRED_FIELDS = ["name", "followers"];

function normaliseHeaderCell(h) {
  return String(h ?? "").trim().toLowerCase().replace(/[^a-z ]/g, "").trim();
}

/**
 * Real-world files often have a title, an instructions row, a blank
 * spacer row, or a logo/legend above the actual header row — not just a
 * clean header on line 1. Rather than assume row 1 is always the header,
 * scan the first several lines and use whichever one actually contains
 * both a Name-like and a Followers-like column. Falls back to line 0 if
 * nothing matches, so the existing "missing required columns" error still
 * fires with a sensible message instead of silently misbehaving.
 */
function findHeaderRowIndex(lines) {
  const maxScan = Math.min(lines.length, 15);
  for (let i = 0; i < maxScan; i++) {
    const cells = parseCsvLine(lines[i]).map(normaliseHeaderCell);
    const hasName = cells.some((c) => HEADER_MAP[c] === "name");
    const hasFollowers = cells.some((c) => HEADER_MAP[c] === "followers");
    if (hasName && hasFollowers) return i;
  }
  return 0;
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

// A creator is matched by name + phone + platform, OR by link + platform
// — either is enough on its own. This matters because real-world sheets
// often have messy phone data (two numbers in one cell, a name typed
// alongside the number, etc.), so relying on phone alone would keep
// creating duplicate entries for the same person every time their phone
// field looked slightly different. The link is usually the more stable
// identifier when that happens.
export function phoneMatchKey(row) {
  const phone = normalisePhone(row.phone);
  if (!phone) return null;
  const platform = (row.platform || "").trim().toLowerCase();
  return `phone|${normaliseName(row.name)}|${phone}|${platform}`;
}

export function linkMatchKey(row) {
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

  // Check that at minimum Name and Followers columns exist.
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
    const followers = parseN(followersRaw);

    const rowErrors = [];

    if (!name) {
      rowErrors.push("Name is empty");
    }

    if (!followersRaw) {
      rowErrors.push("Followers is empty");
    } else if (followers === 0 && followersRaw !== "0") {
      rowErrors.push(`Followers value "${followersRaw}" could not be parsed (expected e.g. 950K, 1.2M, or 950000)`);
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
 * Build the dedup key for a row: name + phone + platform, normalised.
 * Two rows are considered the "same entry" only when all three match —
 * so the same person on Instagram AND YouTube is correctly kept as 2
 * separate entries, while re-importing the same person+platform twice is
 * caught as a duplicate.
 */
export function dedupeKey(row) {
  const normPhone = normalisePhone(row.phone);
  const normName = normaliseName(row.name);
  const platform = (row.platform || "").trim().toLowerCase();
  return `${normName}|${normPhone}|${platform}`;
}

/**
 * Merge imported rows into the existing creators array.
 * Dedup rule: skip if name + phone + platform already exists.
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

    // Skip if the same name+phone+platform combo already exists.
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
 * Unlike mergeCreators (which always skips duplicate name+phone+platform
 * entries), this matches rows to existing creators by that same key and
 * *updates* the existing record's fields in place when a match is found.
 * Rows with no match are appended as new creators (new platform for an
 * existing person, or a brand new person). Used for the "live sheet link"
 * flow, where the whole point is that edits made in the sheet should flow
 * through.
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
  // Two separate lookup indexes — a match on EITHER is enough to treat a
  // row as the same creator, not just phone alone. This matters because
  // real-world phone data is often messy (two numbers in one cell, a
  // name typed next to the number, etc.) — the link is usually the more
  // reliable identifier when that happens.
  const phoneIndex = new Map();
  const linkIndex = new Map();
  existing.forEach((c, i) => {
    const pk = phoneMatchKey(c);
    if (pk && !phoneIndex.has(pk)) phoneIndex.set(pk, i);
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
    const pk = phoneMatchKey(row);
    const lk = linkMatchKey(row);
    let matchIdx = lk !== null ? linkIndex.get(lk) : undefined;
    if (matchIdx === undefined && pk !== null) {
      matchIdx = phoneIndex.get(pk);
    }

    if (matchIdx !== undefined) {
      // Update existing creator in place, keeping its id.
      result[matchIdx] = {
        ...result[matchIdx],
        ...row,
      };
      matchedIdx.add(matchIdx);
      updated++;

      // Re-index under the (possibly changed) phone/link, so a later row
      // in this same batch can still find this creator correctly too.
      const newPk = phoneMatchKey(result[matchIdx]);
      if (newPk) phoneIndex.set(newPk, matchIdx);
      const newLk = linkMatchKey(result[matchIdx]);
      if (newLk) linkIndex.set(newLk, matchIdx);
    } else {
      const newCreator = { id: "sync_" + nextId++, ...row };
      result.push(newCreator);
      const newIdx = result.length - 1;
      matchedIdx.add(newIdx);
      if (pk) phoneIndex.set(pk, newIdx);
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