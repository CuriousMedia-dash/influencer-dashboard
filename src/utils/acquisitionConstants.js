// Design tokens & data constants for the Creator Acquisition module.
// Deliberately separate from utils/constants.js — Creator Acquisition
// is not interconnected with Influencer Marketing and uses its own
// category list, per spec.

// PLACEHOLDER — replace with your real category list. Kept at 9 so it
// lines up 1:1 with the "9 outreach templates" you described; rename/
// add/remove freely, just keep ACQ_CATEGORY_COLORS in sync.
export const ACQ_CATEGORIES = [
  "Comedy",
  "Fiction",
  "Vlogs",
  "Shorts / Reels",
  "Podcast",
  "Regional",
  "International",
  "Production House",
  "Meme Page",
];

export const ACQ_CATEGORY_COLORS = {
  Comedy: "#2BAE9E",
  Fiction: "#6E5BD6",
  Vlogs: "#E08A3B",
  "Shorts / Reels": "#E0524B",
  Podcast: "#3F8FE0",
  Regional: "#2BAE66",
  International: "#1E6FE0",
  "Production House": "#8FA3BC",
  "Meme Page": "#D6669B",
};

// Execution stage — single-select, one stage active at a time.
export const ACQ_EXECUTION_STAGES = [
  "reached_out",
  "meet_responsive",
  "contract_sign",
  "marketing_budget_received",
];

export const ACQ_EXECUTION_STAGE_LABELS = {
  reached_out: "Reached Out",
  meet_responsive: "Meet Responsive",
  contract_sign: "Contract Sign",
  marketing_budget_received: "Marketing Budget Received",
};

export const ACQ_EXECUTION_STAGE_COLORS = {
  reached_out: "#8FA3BC",
  meet_responsive: "#3F8FE0",
  contract_sign: "#6E5BD6",
  marketing_budget_received: "#2BAE66",
};

// MB1/MB2/MB3 — each is a single dropdown, not two checkboxes.
export const MB_STATUS_OPTIONS = ["received", "locked_commission"];

export const MB_STATUS_LABELS = {
  received: "Received",
  locked_commission: "Locked Commission",
};

export const MB_STATUS_COLORS = {
  received: "#2BAE66",
  locked_commission: "#E08A3B",
};
