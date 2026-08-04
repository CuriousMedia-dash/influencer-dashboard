// Design tokens & data constants for the Creator Acquisition module.
// Category lists now live in acquisitionRecordsConfig.js (different
// per Creators vs Influencers) — this file holds what's shared.

// Lead Quality — single-select (replaces the old multi-stage Execution
// Stage pipeline with a simple hot/mild/low temperature read).
export const ACQ_LEAD_QUALITY = ["hot", "mild", "low"];

export const ACQ_LEAD_QUALITY_LABELS = {
  hot: "Hot",
  mild: "Mild",
  low: "Low",
};

export const ACQ_LEAD_QUALITY_COLORS = {
  hot: "#E0524B",
  mild: "#E0A23B",
  low: "#8FA3BC",
};

// MB1/MB2/MB3 — Creators only (Influencers has no marketing-budget
// tracking). Each is a single dropdown, not two checkboxes.
export const MB_STATUS_OPTIONS = ["received", "locked_commission"];

export const MB_STATUS_LABELS = {
  received: "Received",
  locked_commission: "Locked Commission",
};

export const MB_STATUS_COLORS = {
  received: "#2BAE66",
  locked_commission: "#E08A3B",
};
