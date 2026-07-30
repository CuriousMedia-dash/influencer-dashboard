// CSV parser for the Creator Acquisition "Creators" tab. Deliberately
// separate from utils/csvImport.js — different columns, different
// table, not interconnected with the Influencer Marketing schema.

const HEADER_MAP = {
  name: "name",
  creator: "name",
  "creator name": "name",

  link: "profileLink",
  "profile link": "profileLink",
  "channel link": "profileLink",
  instagram: "profileLink",
  url: "profileLink",

  subscribers: "subscribers",
  subscriber: "subscribers",
  followers: "subscribers",
  "follower count": "subscribers",

  mail: "email",
  email: "email",
  "email address": "email",

  number: "phone",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  "mobile number": "phone",
  contact: "phone",

  category: "category",
  niche: "category",

  "execution stage": "executionStage",
  stage: "executionStage",

  convert: "convert",
  converted: "convert",

  "marketing budget": "marketingBudget",
  budget: "marketingBudget",

  mb1: "mb1Status",
  "mb1 status": "mb1Status",
  mb2: "mb2Status",
  "mb2 status": "mb2Status",
  mb3: "mb3Status",
  "mb3 status": "mb3Status",

  "date of joining": "dateOfJoining",
  doj: "dateOfJoining",

  "execution date": "executionDate",

  "handover to smm": "handoverToSmm",
  handover: "handoverToSmm",

  "marketing report": "marketingReport",

  status: "status",
  remark: "status",
  remarks: "status",
};

const EXECUTION_STAGE_INPUT_MAP = {
  "reached out": "reached_out",
  "meet responsive": "meet_responsive",
  "contract sign": "contract_sign",
  "marketing budget received": "marketing_budget_received",
};

const MB_STATUS_INPUT_MAP = {
  received: "received",
  "locked commission": "locked_commission",
};

function normaliseHeaderCell(h) {
  return String(h ?? "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function normaliseYesNo(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "yes" || v === "true" || v === "1" || v === "y";
}

function parseSubscribers(raw) {
  if (raw == null || raw === "") return 0;
  const s = String(raw).trim().toUpperCase().replace(/,/g, "");
  const m = s.match(/^([\d.]+)([KM]?)$/);
  if (!m) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const num = parseFloat(m[1]);
  if (m[2] === "K") return Math.round(num * 1000);
  if (m[2] === "M") return Math.round(num * 1000000);
  return Math.round(num);
}

// Minimal quote-aware CSV line splitter.
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

function parseDateCell(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Accept YYYY-MM-DD as-is; otherwise let Date parse it and reformat.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Parses raw CSV/sheet text into acquisition-creator row objects.
 * Returns { rows, errors }. Only "name" is required per row — anything
 * else blank just imports as empty/default, same non-destructive
 * philosophy as the Influencer Marketing CSV importer.
 */
export function parseAcquisitionCsv(csvText) {
  const lines = String(csvText ?? "").split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], errors: [{ message: "File is empty." }] };

  const headerCells = parseCsvLine(lines[0]).map(normaliseHeaderCell);
  const fieldForCol = headerCells.map((c) => HEADER_MAP[c] || null);

  if (!fieldForCol.includes("name")) {
    return { rows: [], errors: [{ message: 'No "Name" column found in the header row.' }] };
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => c === "")) continue;

    const row = {};
    fieldForCol.forEach((field, idx) => {
      if (!field) return;
      row[field] = cells[idx] ?? "";
    });

    if (!row.name) {
      errors.push({ line: i + 1, message: `Row ${i + 1}: missing name, skipped.` });
      continue;
    }

    rows.push({
      name: row.name || "",
      profileLink: row.profileLink || "",
      subscribers: parseSubscribers(row.subscribers),
      email: (row.email || "").trim(),
      phone: (row.phone || "").trim(),
      category: (row.category || "").trim(),
      executionStage: EXECUTION_STAGE_INPUT_MAP[String(row.executionStage || "").trim().toLowerCase()] || "reached_out",
      convert: normaliseYesNo(row.convert),
      marketingBudget: row.marketingBudget ? row.marketingBudget.replace(/,/g, "") : null,
      mb1Status: MB_STATUS_INPUT_MAP[String(row.mb1Status || "").trim().toLowerCase()] || null,
      mb2Status: MB_STATUS_INPUT_MAP[String(row.mb2Status || "").trim().toLowerCase()] || null,
      mb3Status: MB_STATUS_INPUT_MAP[String(row.mb3Status || "").trim().toLowerCase()] || null,
      dateOfJoining: parseDateCell(row.dateOfJoining),
      executionDate: parseDateCell(row.executionDate),
      handoverToSmm: normaliseYesNo(row.handoverToSmm),
      marketingReport: row.marketingReport || "",
      status: row.status || "",
    });
  }

  return { rows, errors };
}
