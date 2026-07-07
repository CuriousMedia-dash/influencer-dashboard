// Live "linked sheet" sync — lets the user paste a Google Sheet URL once,
// then hit "Sync now" whenever the sheet has changed to pull the latest
// rows into the Creators table (adding new creators, updating existing
// ones matched by phone number).
//
// Multi-tab support: when the pasted URL is a normal Google Sheets share
// link, we fetch the *entire workbook* (every tab, not just one) via the
// XLSX export endpoint and parse each tab separately with the existing CSV
// row parser, then merge all tabs' rows together. Direct CSV / "Publish to
// web" links only ever represent a single tab, so those still go through
// the plain CSV path.

import * as XLSX from "xlsx";
import { parseCsvImport, syncCreators } from "./csvImport";

const STORAGE_KEY = "cm_linked_sheet";

/**
 * Extract the spreadsheet ID from a normal Google Sheets share URL.
 * Returns null if this doesn't look like a Sheets share URL at all.
 */
function extractSheetId(rawUrl) {
  const url = String(rawUrl ?? "").trim();
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * True when the pasted URL is a normal Google Sheets share link (as opposed
 * to a direct CSV URL or a "Publish to web" CSV link) — i.e. one we can
 * fetch as a full multi-tab XLSX workbook.
 */
export function isGoogleSheetsShareUrl(rawUrl) {
  const url = String(rawUrl ?? "").trim();
  if (/output=csv|\/pub\?/.test(url) || url.toLowerCase().endsWith(".csv")) {
    return false;
  }
  return Boolean(extractSheetId(url));
}

/**
 * Build the XLSX export URL for a Google Sheets share link. This endpoint
 * returns the *whole workbook* — every tab — in one file, which is what
 * lets us support multi-tab sync. Works as long as the sheet is shared
 * "Anyone with the link can view".
 */
export function buildXlsxExportUrl(rawUrl) {
  const id = extractSheetId(rawUrl);
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
}

/**
 * Turn whatever URL the user pasted into a CSV-exportable URL (single tab
 * only). Used as a fallback for direct CSV / publish-to-web links, and for
 * anything that isn't a recognisable Google Sheets share URL.
 *
 * Accepts:
 *  - A normal "share" link: https://docs.google.com/spreadsheets/d/<id>/edit#gid=123
 *  - A "Publish to web" CSV link: https://docs.google.com/.../pub?output=csv
 *  - A direct .csv URL (any host)
 */
export function normaliseSheetUrl(rawUrl) {
  const url = String(rawUrl ?? "").trim();
  if (!url) return "";

  // Already a CSV export / publish link — use as-is.
  if (/output=csv|\/pub\?/.test(url) || url.toLowerCase().endsWith(".csv")) {
    return url;
  }

  // Normal Google Sheets share URL — rewrite to the CSV export endpoint.
  const id = extractSheetId(url);
  if (id) {
    const gidMatch = url.match(/[?#&]gid=(\d+)/);
    if (gidMatch) {
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gidMatch[1]}`;
    }
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  }

  // Fall back to whatever was pasted.
  return url;
}

/**
 * Google Apps Script web app endpoints (script.google.com/.../exec, or the
 * script.googleusercontent.com/macros/echo redirect it resolves to) often
 * don't return raw CSV text — they wrap it. Two common shapes we see:
 *   1. A JSON-encoded string: "\"name,followers\\nAda,950000\""
 *   2. Real quotes but literal backslash-n instead of actual newlines.
 * Unwrap those so the CSV line-splitter downstream sees real rows.
 */
function unwrapEchoResponse(text) {
  let t = text.trim();

  // Case 1: the whole payload is a JSON string literal — parse it to get
  // the real content (this also turns \n, \t, \" etc. into real chars).
  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      const parsed = JSON.parse(t);
      if (typeof parsed === "string") return parsed;
    } catch {
      // Not valid JSON — fall through and try the regex approach below.
    }
  }

  // Case 2: no real line breaks in the text, but literal "\n" sequences —
  // the content was escaped without being JSON-quoted. Unescape it.
  if (!/\r|\n/.test(t) && /\\n/.test(t)) {
    t = t.replace(/\\r\\n|\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"');
  }

  return t;
}

/**
 * Fetch CSV text from a linked sheet URL (single tab). Throws a friendly
 * Error on failure (private sheet, network issue, CORS block, etc).
 */
export async function fetchSheetCsv(url) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error(
      "Couldn't reach that link. Check your internet connection and that the URL is correct."
    );
  }

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Access denied. Make sure the sheet is shared as \"Anyone with the link can view\", then try again."
        : response.status === 400
        ? "The sheet couldn't be loaded (HTTP 400) — this usually means the tab reference in the link is wrong. Open the exact tab you want in Google Sheets, copy the URL from the address bar (it should end in #gid=...), and paste that in."
        : `The sheet couldn't be loaded (HTTP ${response.status}). Double-check the link.`
    );
  }

  let text = await response.text();
  text = unwrapEchoResponse(text);

  // Google returns an HTML sign-in page (not CSV) for private sheets.
  if (/^\s*<!DOCTYPE html|^\s*<html/i.test(text)) {
    throw new Error(
      "That link isn't publicly viewable. Set sharing to \"Anyone with the link can view\" and try again."
    );
  }

  if (!text.trim()) {
    if (/script\.googleusercontent\.com\/macros\/echo/i.test(url)) {
      throw new Error(
        "That echo/proxy link came back empty — it's a temporary, session-scoped URL (the \"user_content_key\" only works for the browser session that generated it), so this app can't fetch it directly. " +
          "Instead, paste your regular Google Sheets share link (Share → Anyone with the link → Viewer), or your Apps Script deployment's stable /exec URL if you're using a script."
      );
    }
    throw new Error(
      "The link loaded but came back empty. Double-check it points directly at the sheet's data, and that sharing is set to \"Anyone with the link can view\"."
    );
  }

  return text;
}

/**
 * Fetch the *entire workbook* (all tabs) for a Google Sheets share link and
 * return CSV text per tab: [{ sheetName, csv }, ...]. Throws a friendly
 * Error on failure, same style as fetchSheetCsv.
 */
export async function fetchSheetAllTabsCsv(rawUrl) {
  const xlsxUrl = buildXlsxExportUrl(rawUrl);
  if (!xlsxUrl) {
    throw new Error("That doesn't look like a Google Sheets share link.");
  }

  let response;
  try {
    response = await fetch(xlsxUrl, { cache: "no-store" });
  } catch {
    throw new Error(
      "Couldn't reach that link. Check your internet connection and that the URL is correct."
    );
  }

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Access denied. Make sure the sheet is shared as \"Anyone with the link can view\", then try again."
        : `The sheet couldn't be loaded (HTTP ${response.status}). Double-check the link.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = await response.arrayBuffer();

  // Google returns an HTML sign-in page (not a workbook) for private
  // sheets — that comes back as text/html rather than a spreadsheet type.
  if (/text\/html/i.test(contentType)) {
    throw new Error(
      "That link isn't publicly viewable. Set sharing to \"Anyone with the link can view\" and try again."
    );
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new Error(
      "Couldn't read that sheet as a spreadsheet. Make sure it's a real Google Sheet (not a plain CSV link) and that sharing is set to \"Anyone with the link can view\"."
    );
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("The sheet loaded but has no tabs with data.");
  }

  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    csv: XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]),
  }));
}

/**
 * End-to-end sync: fetch rows from a sheet URL (multi-tab aware) and merge
 * them into the given creators list. Shared by the manual "Sync now" button
 * and the background auto-sync so both follow identical logic. Throws a
 * friendly Error (same messages as fetchSheetCsv/fetchSheetAllTabsCsv) if
 * nothing usable comes back.
 */
export async function syncFromSheetUrl(rawUrl, creators, { mirror = false } = {}) {
  let rows = [];
  let parseErrors = [];

  if (isGoogleSheetsShareUrl(rawUrl)) {
    const tabs = await fetchSheetAllTabsCsv(rawUrl);
    tabs.forEach(({ sheetName, csv }) => {
      const parsed = parseCsvImport(csv);
      rows.push(...parsed.rows);
      parseErrors.push(
        ...parsed.errors.map((e) => ({ ...e, message: `[${sheetName}] ${e.message}` }))
      );
    });
  } else {
    const csvUrl = normaliseSheetUrl(rawUrl);
    const text = await fetchSheetCsv(csvUrl);
    const parsed = parseCsvImport(text);
    rows = parsed.rows;
    parseErrors = parsed.errors;
  }

  if (rows.length === 0) {
    const msg =
      (parseErrors[0]?.message || "No usable rows found.") +
      (parseErrors.length > 1 ? ` (+${parseErrors.length - 1} more)` : "");
    throw new Error(msg);
  }

  const { merged, added, updated, removed } = syncCreators(creators, rows, { mirror });
  return { merged, added, updated, removed, rowErrors: parseErrors };
}

export function getSavedSheetLink() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSheetLink({ url, lastSyncedAt, mirror }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, lastSyncedAt, mirror: Boolean(mirror) }));
  } catch {
    // Ignore storage failures (e.g. private browsing) — sync still works
    // for the current session, it just won't persist across reloads.
  }
}

export function clearSavedSheetLink() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}