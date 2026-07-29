// Shared creator <-> database row mapping. Used by CreatorsContext (writes),
// usePaginatedCreators (reads), and anywhere else that needs to translate
// between the app's creator shape and the `creators` table's columns.

export const CREATOR_FIELD_MAP = {
  name: "name",
  phone: "phone",
  email: "email",
  platform: "platform",
  profileLink: "profile_link",
  followers: "followers",
  gender: "gender",
  category: "category",
  language: "language",
  city: "city",
  tier: "tier",
  remark: "remark",
  quit: "quit",
  commercial: "commercial",
};

export function creatorFromRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    platform: row.platform || "",
    profileLink: row.profile_link || "",
    followers: row.followers || 0,
    gender: row.gender || "",
    category: row.category || "",
    language: row.language || "",
    city: row.city || "",
    tier: row.tier || "",
    remark: row.remark || "",
    quit: row.quit || false,
    commercial: row.commercial ?? "",
    deletedAt: row.deleted_at || null,
    dedupeKey: row.dedupe_key || null,
  };
}

// Columns in the database that only accept a real number — anything else
// (blank, "55,000" with a comma, "updating", free text) has to be
// converted to either a clean number or null before it's sent, or
// Postgres rejects the entire batch outright.
const NUMERIC_COLUMNS = new Set(["commercial"]);

function sanitizeNumericForDb(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function toCreatorColumns(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = CREATOR_FIELD_MAP[k];
    if (!col) return;
    if (NUMERIC_COLUMNS.has(col)) {
      out[col] = sanitizeNumericForDb(v);
    } else {
      out[col] = v === "" ? null : v;
    }
  });
  return out;
}
