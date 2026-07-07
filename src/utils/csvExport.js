// CSV export helper — builds a CSV string from creator rows and triggers
// a browser download. No external dependency needed for this simple case.

import { summarizePaymentInfo } from "./format";
//
// One row per creator RECORD (which is already one row per platform — a
// creator on Instagram + YouTube is 2 separate records/rows). This is the
// same shape ImportCreatorsModal/csvImport.js reads back in, so
// export → edit in Sheets → sync round-trips cleanly.
const CSV_COLUMNS = [
  { key: "name", label: "Creator" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "platform", label: "Platform" },
  { key: "profileLink", label: "Link" },
  { key: "gender", label: "Gender" },
  { key: "category", label: "Niche" },
  { key: "language", label: "Language" },
  { key: "followers", label: "Followers" },
  { key: "tier", label: "Category" },
  { key: "commercial", label: "Commercial" },
  { key: "remark", label: "Remarks" },
];

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function creatorsToCsv(rows, getTierLabel) {
  const header = CSV_COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const lines = rows.map((r) =>
    CSV_COLUMNS.map((c) => {
      if (c.key === "tier") return csvEscape(getTierLabel(r.followers));
      return csvEscape(r[c.key]);
    }).join(",")
  );
  return [header, ...lines].join("\r\n");
}

// Campaign creator export — core creator info plus the campaign-specific
// fields (commercial, negotiation status, locked cost, lock status, lock
// confirmation dates, execution stage, live link/date, payment info,
// payment status, remarks) that live on the creator↔campaign link rather
// than the creator record itself.
const CAMPAIGN_CSV_COLUMNS = [
  { key: "name", label: "Creator" },
  { key: "platform", label: "Platform" },
  { key: "followers", label: "Followers" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "commercial", label: "Commercial" },
  { key: "negotiationStatus", label: "Negotiation Status" },
  { key: "lockedCost", label: "Locked Cost" },
  { key: "lockStatus", label: "Lock Status" },
   { key: "emailSent", label: "Email Sent" },
  { key: "approvalReceived", label: "Approval Received" },
  { key: "executionStage", label: "Execution Stage" },
  { key: "liveLink", label: "Live Link" },
  { key: "liveDate", label: "Live Date" },
  { key: "paymentInfo", label: "Payment Info" },
  { key: "advanceAmount", label: "Advance Amount" },
  { key: "advancePaid", label: "Advance Paid" },
  { key: "fullAmount", label: "Full Payment Amount" },
  { key: "fullPaid", label: "Full Payment Paid" },
  { key: "remark", label: "Remarks" },
];

export function campaignCreatorsToCsv(links, getCreatorById) {
  const header = CAMPAIGN_CSV_COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const lines = links
    .map((link) => {
      const creator = getCreatorById(link.creatorId);
      if (!creator) return null;
      return CAMPAIGN_CSV_COLUMNS.map((c) => {
        if (c.key === "platform") return csvEscape(creator.platform || "");
        if (c.key === "paymentInfo") return csvEscape(summarizePaymentInfo(link.paymentInfo));
        if (c.key === "advancePaid" || c.key === "fullPaid") return csvEscape(link[c.key] ? "Yes" : "No");
        if (c.key in link) return csvEscape(link[c.key]);
        return csvEscape(creator[c.key]);
      }).join(",");
    })
    .filter(Boolean);
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename, csvString) {
  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}