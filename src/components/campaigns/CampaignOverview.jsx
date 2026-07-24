import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_COLORS } from "../../utils/constants";
import { hex2rgba, parseN } from "../../utils/format";

function fmtBudget(n) {
  if (!n) return "\u2014";
  return "\u20b9" + new Intl.NumberFormat("en-IN").format(n);
}

function fmtDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * One overview field. Click the pencil to edit inline; Enter/check to save,
 * Escape/X to cancel. Keeps everything on the page (no popovers) since this
 * is a small fixed set of campaign-level fields.
 */
function OverviewField({ label, value, displayValue, type = "text", options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function startEdit() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function save() {
    onSave(type === "number" ? Number(draft) || 0 : draft);
    setEditing(false);
  }

  return (
    <div
      className="rounded-[11px] border px-3.5 py-3"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div
        className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[.07em]"
        style={{ color: "var(--ink3)" }}
      >
        {label}
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] transition-colors hover:bg-[var(--up)]"
            style={{ color: "var(--ink3)" }}
            title={`Edit ${label.toLowerCase()}`}
          >
            <Pencil size={11} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          {options ? (
            <select
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="ep-text-input"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              className="ep-text-input"
            />
          )}
          <button
            type="button"
            onClick={save}
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] text-white"
            style={{ background: "var(--am)" }}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] border"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div
          className="text-base font-semibold"
          style={{
            color: "var(--ink)",
            fontFamily:
              type === "number" ? "'JetBrains Mono', monospace" : undefined,
          }}
        >
          {displayValue ?? value ?? "\u2014"}
        </div>
      )}
    </div>
  );
}

/**
 * Remaining budget = campaign budget minus the sum of every creator link's
 * "locked price" value (independent of the Locked/Unlocked toggle — that
 * toggle tracks deal confirmation, not whether a price has been entered).
 * This is derived, not stored — it recalculates live any time budget
 * changes or any locked price value in the table changes, so it never
 * needs its own edit control.
 */
function RemainingBudgetField({ campaign }) {
  const spent = (campaign.creatorLinks || []).reduce(
    (sum, l) => sum + parseN(l.lockedCost),
    0
  );
  const remaining = (Number(campaign.budget) || 0) - spent;
  const isOverBudget = remaining < 0;

  return (
    <div
      className="rounded-[11px] border px-3.5 py-3"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div
        className="mb-1.5 text-[11px] uppercase tracking-[.07em]"
        style={{ color: "var(--ink3)" }}
      >
        Remaining Budget
      </div>
      <div
        className="text-base font-semibold"
        style={{
          color: isOverBudget ? "#E0524B" : "var(--ink)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
        title={`Budget ${fmtBudget(campaign.budget)} \u2212 Locked price total ${fmtBudget(spent)}`}
      >
        {fmtBudget(remaining)}
      </div>
    </div>
  );
}

/**
 * Locked Profiles = how many creator links in this campaign have your own
 * (agency-side) Locked/Unlocked toggle set to locked. Independent of the
 * brand's own separate "Locked Profiles" count on their dashboard.
 */
function LockedProfilesField({ campaign }) {
  const locked = (campaign.creatorLinks || []).filter(
    (l) => l.lockStatus === "locked"
  ).length;
  const total = (campaign.creatorLinks || []).length;

  return (
    <div
      className="rounded-[11px] border px-3.5 py-3"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div
        className="mb-1.5 text-[11px] uppercase tracking-[.07em]"
        style={{ color: "var(--ink3)" }}
      >
        Locked Profiles
      </div>
      <div
        className="text-base font-semibold"
        style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {locked}/{total}
      </div>
    </div>
  );
}

/**
 * Live Link Count — shows how many creator links actually have a live
 * link entered (posted) against the target the agency sets (how many are
 * expected for this campaign). The posted number is computed, the target
 * is the one editable piece — click the pencil to change it.
 */
function LiveLinkCountField({ campaign, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(campaign.linksExpected ?? "");

  const posted = (campaign.creatorLinks || []).reduce(
    (sum, l) => sum + (Array.isArray(l.liveLinks) ? l.liveLinks.length : 0),
    0
  );

  function startEdit() {
    setDraft(campaign.linksExpected ?? "");
    setEditing(true);
  }

  function save() {
    onUpdate({ linksExpected: Number(draft) || 0 });
    setEditing(false);
  }

  return (
    <div
      className="rounded-[11px] border px-3.5 py-3"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div
        className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[.07em]"
        style={{ color: "var(--ink3)" }}
      >
        Live Link Count
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] transition-colors hover:bg-[var(--up)]"
            style={{ color: "var(--ink3)" }}
            title="Edit target link count"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <span
            className="flex-shrink-0 text-base font-semibold"
            style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {posted}/
          </span>
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="ep-text-input"
          />
          <button
            type="button"
            onClick={save}
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] text-white"
            style={{ background: "var(--am)" }}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] border"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div
          className="text-base font-semibold"
          style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {posted}/{campaign.linksExpected || "\u2014"}
        </div>
      )}
    </div>
  );
}

export default function CampaignOverview({ campaign, onUpdate }) {
  const statusColor = CAMPAIGN_STATUS_COLORS[campaign.status] || "#8FA3BC";

  return (
    <div className="mb-[18px] grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
      <OverviewField
        label="Client"
        value={campaign.client}
        onSave={(v) => onUpdate({ client: v })}
      />
      <OverviewField
        label="Budget"
        value={campaign.budget}
        displayValue={fmtBudget(campaign.budget)}
        type="number"
        onSave={(v) => onUpdate({ budget: v })}
      />
      <OverviewField
        label="Timeline start"
        value={campaign.timelineStart}
        displayValue={fmtDate(campaign.timelineStart)}
        type="date"
        onSave={(v) => onUpdate({ timelineStart: v })}
      />
      <OverviewField
        label="Timeline end"
        value={campaign.timelineEnd}
        displayValue={fmtDate(campaign.timelineEnd)}
        type="date"
        onSave={(v) => onUpdate({ timelineEnd: v })}
      />
      <OverviewField
        label="Point of Contact (POC)"
        value={campaign.poc || campaign.owner}
        onSave={(v) => onUpdate({ owner: v, poc: v })}
      />
      <LiveLinkCountField campaign={campaign} onUpdate={onUpdate} />
      <div
        className="rounded-[11px] border px-3.5 py-3"
        style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
      >
        <div
          className="mb-1.5 text-[11px] uppercase tracking-[.07em]"
          style={{ color: "var(--ink3)" }}
        >
          Status
        </div>
        <select
          value={campaign.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
          className="w-full rounded-[7px] border-0 bg-transparent text-base font-semibold outline-none"
          style={{ color: statusColor }}
        >
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s} style={{ color: hex2rgba("#10243E", 1) }}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <RemainingBudgetField campaign={campaign} />
      <LockedProfilesField campaign={campaign} />
    </div>
  );
}