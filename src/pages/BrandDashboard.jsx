import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { fmt, hex2rgba, toHref } from "../utils/format";
import { EXECUTION_STAGE_COLORS } from "../utils/constants";
import { brandDashboardToCsv, downloadCsv } from "../utils/csvExport";
import { Lock, Unlock, Sun, Moon, Download, Plus, Mail, Upload, Image as ImageIcon, X } from "lucide-react";

// The brand dashboard's light/dark toggle is entirely its own — separate
// from the main app's theme.
const BRAND_THEME_KEY = "cm_brand_theme";

function loadBrandTheme() {
  try {
    const saved = localStorage.getItem(BRAND_THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore — fall through to system preference
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function parseAmount(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Opens a mail draft (blank "to" — filled in by whoever's sending, same
 * pattern as the internal app's payment-email button) confirming a
 * locked creator and the final cost, addressed to the brand.
 */
function sendLockConfirmationEmail({ campaignName, creatorName, finalCost }) {
  const subject = `Locked: ${creatorName} \u2014 ${campaignName || "Campaign"}`;
  const body = [
    `Hi,`,
    ``,
    `Confirming that we've locked ${creatorName} for this campaign.`,
    `Final cost: \u20b9${fmt(parseAmount(finalCost))}`,
    ``,
    `Let us know if anything looks off.`,
  ].join("\n");
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Slab card used for the top summary row.
function SlabCard({ label, children, editable, value, onChange, type = "text", placeholder }) {
  return (
    <div
      className="rounded-[11px] border px-3.5 py-3"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div
        className="mb-1.5 text-[11px] uppercase tracking-[.07em]"
        style={{ color: "var(--ink3)" }}
      >
        {label}
      </div>
      {editable ? (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-base font-semibold outline-none"
          style={{ color: "var(--ink)" }}
        />
      ) : (
        <div className="text-base font-semibold" style={{ color: "var(--ink)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Upload/replace/view the "brand sent approval" screenshot. Anyone with
// the link can upload or replace it (agency or brand) — there's no login
// here to restrict it further, matching how the rest of this page works.
function ApprovalScreenshotUpload({ campaignId, creatorId, screenshotUrl, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaignId}/${creatorId}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("brand-approvals")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("brand-approvals").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setUploadError(err.message || "Upload failed \u2014 try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {screenshotUrl ? (
        <>
          <a href={screenshotUrl} target="_blank" rel="noreferrer" title="View approval screenshot">
            <img
              src={screenshotUrl}
              alt="Approval screenshot"
              className="h-[22px] w-[22px] rounded-[5px] border object-cover"
              style={{ borderColor: "var(--ln)" }}
            />
          </a>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Replace screenshot"
            className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors disabled:opacity-60"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            <Upload size={10} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Upload approval screenshot"
          className="flex items-center gap-1 rounded-[6px] border px-1.5 py-1 text-[10px] transition-colors disabled:opacity-60"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--up)" }}
        >
          <ImageIcon size={10} />
          {uploading ? "Uploading\u2026" : "Add SS"}
        </button>
      )}
      {uploadError && (
        <span className="text-[9.5px]" style={{ color: "#E0524B" }}>
          {uploadError}
        </span>
      )}
    </div>
  );
}

// Small anchored popover for editing Proposal Cost + Reimbursement together.
function LockedCostPopover({ anchorRef, lockedCost, reimbursement, onChange, onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const pw = 220;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    if (top + 190 > window.innerHeight) top = rect.top - 196;
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest(".locked-cost-trigger")
      ) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  const total = parseAmount(lockedCost) + parseAmount(reimbursement);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[220px] rounded-[10px] border p-3 shadow-[0_8px_32px_rgba(16,36,62,.18)]"
      style={{ top: pos.top, left: pos.left, background: "var(--panel)", borderColor: "var(--ln)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4 className="mb-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>
        Proposal Cost
      </h4>

      <label className="mb-1 block text-[10px]" style={{ color: "var(--ink3)" }}>
        Proposal Cost
      </label>
      <div className="mb-2.5 flex items-center gap-1">
        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
        <input
          autoFocus
          type="text"
          value={lockedCost ?? ""}
          onChange={(e) => onChange("brandLockedCost", e.target.value)}
          placeholder="0"
          className="w-full rounded-[7px] border px-[9px] py-[6px] text-xs outline-none"
          style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>

      <label className="mb-1 block text-[10px]" style={{ color: "var(--ink3)" }}>
        + Reimbursement
      </label>
      <div className="mb-2.5 flex items-center gap-1">
        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
        <input
          type="text"
          value={reimbursement ?? ""}
          onChange={(e) => onChange("brandReimbursement", e.target.value)}
          placeholder="0"
          className="w-full rounded-[7px] border px-[9px] py-[6px] text-xs outline-none"
          style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>

      <div className="mb-3 text-[11.5px] font-semibold" style={{ color: "var(--ink2)" }}>
        Total: {"\u20b9"}
        {fmt(total)}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-[7px] py-[7px] text-xs font-semibold text-white"
        style={{ background: "var(--am)" }}
      >
        Done
      </button>
    </div>
  );
}

// The visible cell shows only the Proposal Cost value; Reimbursement + Total
// live inside the popover, opened by clicking.
function LockedCostCell({ lockedCost, reimbursement, onChange }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(true)}
        title="Click to edit proposal cost & reimbursement"
        className="locked-cost-trigger flex items-center gap-1 text-left"
      >
        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
        <span
          className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px]"
          style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {fmt(parseAmount(lockedCost))}
        </span>
      </button>

      {open && (
        <LockedCostPopover
          anchorRef={anchorRef}
          lockedCost={lockedCost}
          reimbursement={reimbursement}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default function BrandDashboard() {
  const { token: campaignId } = useParams();
  return <BrandDashboardView key={campaignId} campaignId={campaignId} />;
}

function BrandDashboardView({ campaignId }) {
  const [data, setData] = useState(undefined); // undefined = loading, null = not found
  const [theme, setTheme] = useState(loadBrandTheme);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: result, error } = await supabase.rpc("get_brand_dashboard", {
        p_campaign_id: campaignId,
      });
      if (cancelled) return;
      if (error || !result || !result.campaign) {
        console.error("Failed to load brand dashboard:", error?.message);
        setData(null);
        return;
      }
      setData(result);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    try {
      localStorage.setItem(BRAND_THEME_KEY, theme);
    } catch {
      // Ignore — theme just won't persist across reloads.
    }
  }, [theme]);

  // Fires the write immediately in the background; local state already
  // reflects the change the instant someone types, so typing never waits
  // on the network.
  function updateLinkField(creatorId, field, value) {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.creatorId === creatorId ? { ...r, [field]: value } : r)),
    }));
    supabase
      .rpc("update_brand_dashboard_link", {
        p_campaign_id: campaignId,
        p_creator_id: creatorId,
        p_field: field,
        p_value: String(value),
      })
      .then(({ error }) => {
        if (error) console.error("Failed to save brand dashboard change:", error.message);
      });
  }

  function updateMetaField(field, value) {
    setData((prev) => ({ ...prev, campaign: { ...prev.campaign, [field]: value } }));
    supabase
      .rpc("update_brand_dashboard_meta", {
        p_campaign_id: campaignId,
        p_field: field,
        p_value: String(value),
      })
      .then(({ error }) => {
        if (error) console.error("Failed to save brand dashboard change:", error.message);
      });
  }

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm" style={{ background: "#E7F0FA", color: "#5B7390" }}>
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "#E7F0FA" }}>
        <div className="max-w-sm rounded-[14px] border p-6 text-center" style={{ background: "#fff", borderColor: "#D9E4F2" }}>
          <h1 className="mb-1.5 text-lg font-semibold" style={{ fontFamily: "Fraunces, serif" }}>
            Link not valid
          </h1>
          <p className="text-sm" style={{ color: "#5B6B82" }}>
            This dashboard link is broken or the campaign no longer exists. Ask for a fresh link from the campaign owner.
          </p>
        </div>
      </div>
    );
  }

  const { campaign, rows } = data;
  const linksPosted = rows.filter((r) => r.liveLink).length;
  const linksExpected = Number(campaign.linksExpected) || rows.length;
  const lockedProfilesCount = rows.filter((r) => r.brandLocked).length;

  return (
    <div data-theme={theme} className="min-h-screen p-6" style={{ background: "var(--bg-page)" }}>
      <style>{`
        @media print {
          [data-theme] {
            --ink:#10243E; --ink2:#5B7390; --ink3:#8FA3BC;
            --bg:#F4F8FC; --bg-page:#FFFFFF; --panel:#FFFFFF;
            --up:#EAF2FA; --ln:#D9E4F2; --am:#1E6FE0;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div
              className="text-[13px] font-semibold uppercase tracking-[.1em]"
              style={{ color: "var(--am)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Brand Dashboard
            </div>
            <div
              className="mt-0.5 text-[11px] uppercase tracking-[.13em]"
              style={{ color: "var(--ink3)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Live {"\u2014"} always shows the latest data
            </div>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border transition-colors"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(`${campaign.name || "brand-dashboard"}.csv`, brandDashboardToCsv(rows))}
              className="flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
            >
              <Download size={13} />
              Download CSV
            </button>
          </div>
        </div>

        <h1
          className="mb-5 text-[28px] font-semibold"
          style={{ fontFamily: "Fraunces, serif", color: "var(--ink)", letterSpacing: "-0.01em" }}
        >
          {campaign.name}
        </h1>

        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <SlabCard
            label="Client"
            editable
            value={campaign.brandClient}
            onChange={(v) => updateMetaField("brandClient", v)}
            placeholder={campaign.client || "\u2014"}
          />

          <SlabCard
            label={"Budget (\u20b9)"}
            editable
            type="number"
            value={campaign.brandBudget}
            onChange={(v) => updateMetaField("brandBudget", v)}
            placeholder="0"
          />

          <SlabCard
            label="Timeline"
            editable
            type="date"
            value={campaign.brandTimelineEnd}
            onChange={(v) => updateMetaField("brandTimelineEnd", v)}
          />

          <SlabCard label="Links Posted">
            {linksPosted}/{linksExpected}
          </SlabCard>

          <SlabCard label="Locked Profiles">{lockedProfilesCount}</SlabCard>

          <SlabCard
            label="Point Of Contact(POC)"
            editable
            value={campaign.brandPoc}
            onChange={(v) => updateMetaField("brandPoc", v)}
            placeholder={campaign.poc || "\u2014"}
          />
        </div>

        <div className="overflow-auto rounded-[13px] border" style={{ background: "var(--panel)", borderColor: "var(--ln)" }}>
          <table className="w-full border-collapse text-sm" style={{ minWidth: 1180 }}>
            <thead>
              <tr>
                {[
                  "Creator", "Followers", "Proposal Cost", "Counter Cost", "Final Cost",
                  "Remarks", "Locked Status", "Execution Stage", "Live Video Link", "Viewership",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b px-4 py-3 text-left text-[11px] uppercase tracking-[.06em]"
                    style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--bg)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stageColor = EXECUTION_STAGE_COLORS[row.executionStage] || "#8FA3BC";

                return (
                  <tr key={row.creatorId}>
                    <td className="whitespace-nowrap border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      {row.profileLink && toHref(row.profileLink) ? (
                        <a
                          href={toHref(row.profileLink)}
                          target="_blank"
                          rel="noreferrer"
                          title="View profile"
                          className="underline decoration-1 underline-offset-2"
                          style={{ color: "var(--am)" }}
                        >
                          {row.name}
                        </a>
                      ) : (
                        <span style={{ color: "var(--ink)" }}>{row.name}</span>
                      )}
                    </td>

                    <td
                      className="border-b px-4 py-3"
                      style={{ borderColor: "var(--ln)", color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {fmt(row.followers)}
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <LockedCostCell
                        lockedCost={row.brandLockedCost}
                        reimbursement={row.brandReimbursement}
                        onChange={(field, value) => updateLinkField(row.creatorId, field, value)}
                      />
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex items-center gap-1">
                        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                        <input
                          type="text"
                          value={row.brandCounterCost ?? ""}
                          onChange={(e) => updateLinkField(row.creatorId, "brandCounterCost", e.target.value)}
                          placeholder="0"
                          className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none"
                          style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex items-center gap-1">
                        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                        <input
                          type="text"
                          value={row.brandFinalCost ?? ""}
                          onChange={(e) => updateLinkField(row.creatorId, "brandFinalCost", e.target.value)}
                          placeholder="0"
                          className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none"
                          style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <textarea
                        value={row.brandRemark ?? ""}
                        onChange={(e) => updateLinkField(row.creatorId, "brandRemark", e.target.value)}
                        placeholder={"Add a remark\u2026"}
                        rows={2}
                        className="w-[190px] resize-y rounded-[6px] border px-2 py-1 text-[12px] outline-none"
                        style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)" }}
                      />
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateLinkField(row.creatorId, "brandLocked", !row.brandLocked)}
                          className="flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                          style={
                            row.brandLocked
                              ? { borderColor: "#2BAE66", color: "#2BAE66", background: "rgba(43,174,102,.08)" }
                              : { borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--up)" }
                          }
                        >
                          {row.brandLocked ? <Lock size={11} /> : <Unlock size={11} />}
                          {row.brandLocked ? "Locked" : "Unlocked"}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Email the brand: locked creator + final cost"
                            onClick={() =>
                              sendLockConfirmationEmail({
                                campaignName: campaign.name,
                                creatorName: row.name,
                                finalCost: row.brandFinalCost,
                              })
                            }
                            className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors"
                            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                          >
                            <Mail size={11} />
                          </button>

                          <ApprovalScreenshotUpload
                            campaignId={campaign.id}
                            creatorId={row.creatorId}
                            screenshotUrl={row.brandApprovalScreenshotUrl}
                            onChange={(url) => updateLinkField(row.creatorId, "brandApprovalScreenshotUrl", url)}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex flex-col gap-1">
                        <span
                          className="inline-flex w-fit whitespace-nowrap rounded-full border px-2 py-[3px] text-[11px]"
                          style={{ color: stageColor, borderColor: hex2rgba(stageColor, 0.35), background: hex2rgba(stageColor, 0.08) }}
                        >
                          {row.executionStage}
                        </span>
                        {row.liveDate && (
                          <span className="text-[10.5px]" style={{ color: "var(--ink3)" }}>
                            {fmtDate(row.liveDate)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      {row.liveLink && toHref(row.liveLink) ? (
                        <a
                          href={toHref(row.liveLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-1 underline-offset-2"
                          style={{ color: "var(--am)" }}
                        >
                          View
                        </a>
                      ) : (
                        <span style={{ color: "var(--ink3)" }}>{"\u2014"}</span>
                      )}
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <input
                        type="text"
                        value={row.brandViewership ?? ""}
                        onChange={(e) => updateLinkField(row.creatorId, "brandViewership", e.target.value)}
                        placeholder="0"
                        className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none"
                        style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--ink3)" }}>
              No creators in this campaign yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}