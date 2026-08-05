// Auto-syncs the Creators tab from a specific Google Sheet where each
// TAB is a category (not a column). Only name, link, and mail are
// pulled in — everything else on a matched row (execution stage,
// convert, dates, handover, budget, remarks, stakeholder, etc.) is left
// completely untouched, even on re-sync.
//
// Runs client-side on an interval while the Creators tab is open — not
// a background/server job, so it only syncs while someone has the page
// open (per your call on keeping this simple, no new backend needed).

import { fetchSheetCsv } from "./sheetSync";

export const CATEGORY_SHEET_ID = "1is_Qmrkl04CQnPtWtsV7ZsswMB_8vz6KrYYPHQ0wcls";

// Sheet tab name -> your app's category. Tabs not listed here (e.g.
// "Horror", which doesn't exist in your category list, and "All",
// which looks like a catch-all/duplicate tab) are skipped entirely.
export const TAB_CATEGORY_MAP = {
  "Roasting & Reaction": "Roasting",
  "Podcast": "Podcast",
  "Non Fiction": "Non-Fiction",
  "Educational Channel": "Informative",
  "News": "News",
  "Animation - Creators": "Animation",
  "Fictional": "Fiction",
};

function gvizCsvUrl(tabName) {
  return `https://docs.google.com/spreadsheets/d/${CATEGORY_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

// Minimal quote-aware CSV line splitter (same approach as the general
// CSV importer, kept local here to avoid coupling the two).
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function normaliseHeader(h) {
  return String(h ?? "").trim().toLowerCase();
}

// Only these three fields are ever read from the sheet.
function findColumnIndex(headerCells, candidates) {
  const idx = headerCells.findIndex((h) => candidates.some((c) => normaliseHeader(h).includes(c)));
  return idx;
}

function parseTabRows(csvText, category) {
  const lines = String(csvText ?? "").split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]);
  const nameIdx = findColumnIndex(headerCells, ["channel name", "name"]);
  const linkIdx = findColumnIndex(headerCells, ["channel link", "link"]);
  const emailIdx = findColumnIndex(headerCells, ["email"]);

  if (nameIdx === -1) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = (cells[nameIdx] || "").trim();
    if (!name) continue;
    rows.push({
      name,
      profileLink: linkIdx !== -1 ? (cells[linkIdx] || "").trim() : "",
      email: emailIdx !== -1 ? (cells[emailIdx] || "").trim() : "",
      category,
    });
  }
  return rows;
}

/**
 * Fetches every mapped tab and returns a flat list of { name, profileLink, email, category }.
 * Throws if the sheet itself can't be reached; a single tab failing to
 * parse is skipped rather than aborting the whole sync.
 */
export async function fetchCategorySheetRows() {
  const allRows = [];
  const errors = [];

  for (const [tabName, category] of Object.entries(TAB_CATEGORY_MAP)) {
    try {
      const csvText = await fetchSheetCsv(gvizCsvUrl(tabName));
      allRows.push(...parseTabRows(csvText, category));
    } catch (err) {
      errors.push({ tabName, message: err.message || String(err) });
    }
  }

  return { rows: allRows, errors };
}