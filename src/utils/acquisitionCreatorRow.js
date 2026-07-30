// Shared row <-> app-shape mapping for the `acquisition_creators` table.
// Mirrors the pattern in utils/creatorRow.js, kept separate on purpose —
// this module isn't interconnected with the Influencer Marketing schema.

export const ACQ_CREATOR_FIELD_MAP = {
  name: "name",
  profileLink: "profile_link",
  subscribers: "subscribers",
  email: "email",
  phone: "phone",
  category: "category",
  executionStage: "execution_stage",
  convert: "convert",
  marketingBudget: "marketing_budget",
  mb1Status: "mb1_status",
  mb2Status: "mb2_status",
  mb3Status: "mb3_status",
  dateOfJoining: "date_of_joining",
  executionDate: "execution_date",
  handoverToSmm: "handover_to_smm",
  marketingReport: "marketing_report",
  status: "status",
};

export function acqCreatorFromRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    profileLink: row.profile_link || "",
    subscribers: row.subscribers || 0,
    email: row.email || "",
    phone: row.phone || "",
    category: row.category || "",
    executionStage: row.execution_stage || "reached_out",
    convert: row.convert || false,
    marketingBudget: row.marketing_budget ?? "",
    mb1Status: row.mb1_status || "",
    mb2Status: row.mb2_status || "",
    mb3Status: row.mb3_status || "",
    dateOfJoining: row.date_of_joining || "",
    executionDate: row.execution_date || "",
    handoverToSmm: row.handover_to_smm || false,
    marketingReport: row.marketing_report || "",
    status: row.status || "",
    createdAt: row.created_at || null,
    deletedAt: row.deleted_at || null,
  };
}

const NUMERIC_COLUMNS = new Set(["subscribers", "marketing_budget"]);

function sanitizeNumericForDb(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function toAcqCreatorColumns(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = ACQ_CREATOR_FIELD_MAP[k];
    if (!col) return;
    out[col] = NUMERIC_COLUMNS.has(col) ? sanitizeNumericForDb(v) : v;
  });
  return out;
}
