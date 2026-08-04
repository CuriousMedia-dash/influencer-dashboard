// Shared row <-> app-shape mapping for both acquisition_creators and
// acquisition_influencers. Influencers doesn't have the marketing-budget
// columns (dropped in the migration) — the context layer strips those
// fields before writing for that resource, so this mapper just ignores
// whatever isn't present on a given row.

export const ACQ_CREATOR_FIELD_MAP = {
  name: "name",
  profileLink: "profile_link",
  subscribers: "subscribers",
  email: "email",
  phone: "phone",
  category: "category",
  executionStage: "execution_stage", // now labeled "Lead Quality" in the UI
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
  stakeholder: "stakeholder",
  stakeholderEmail: "stakeholder_email",
  claimedAt: "claimed_at",
  remark1: "remark1",
  remark2: "remark2",
  remark3: "remark3",
  convertPdfUrl: "convert_pdf_url",
  convertPdfName: "convert_pdf_name",
  marketingReportCsvUrl: "marketing_report_csv_url",
  marketingReportCsvName: "marketing_report_csv_name",
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
    executionStage: row.execution_stage || "",
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
    stakeholder: row.stakeholder || "",
    stakeholderEmail: row.stakeholder_email || "",
    claimedAt: row.claimed_at || null,
    remark1: row.remark1 || "",
    remark2: row.remark2 || "",
    remark3: row.remark3 || "",
    convertPdfUrl: row.convert_pdf_url || "",
    convertPdfName: row.convert_pdf_name || "",
    marketingReportCsvUrl: row.marketing_report_csv_url || "",
    marketingReportCsvName: row.marketing_report_csv_name || "",
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

// Fields that don't exist on acquisition_influencers at all (dropped in
// the migration) — stripped before any insert/update for that resource.
export const MARKETING_BUDGET_FIELDS = ["marketingBudget", "mb1Status", "mb2Status", "mb3Status"];
