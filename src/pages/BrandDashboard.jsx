import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabaseBrand } from "../lib/supabaseBrandClient";
import { useBrandAuth } from "../hooks/useBrandAuth";
import { fmt, hex2rgba, toHref } from "../utils/format";
import { EXECUTION_STAGE_COLORS } from "../utils/constants";
import { brandDashboardToCsv, downloadCsv } from "../utils/csvExport";
import { Lock, Unlock, Sun, Moon, Download, Send, X, CheckCircle2, LogOut } from "lucide-react";
import UserAvatar from "../components/ui/UserAvatar";
import { logActivity } from "../utils/activityLog";

// Plain, simple styling — matches the green already used everywhere else
// in the app for confirmed/paid/locked states, no special new treatment.
const LOCK_COLOR = "#2BAE66";
const LOCK_WASH = "rgba(43,174,102,.08)";
const LOCK_BORDER = "rgba(43,174,102,.3)";

const BRAND_THEME_KEY = "cm_brand_theme";

function loadBrandTheme() {
  try {
    const saved = localStorage.getItem(BRAND_THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore — falls through to the light default below
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
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Slab card used for the top summary row.
function SlabCard({ label, children, editable, value, onChange, type = "text", placeholder }) {
  return (
    <div
      className="relative overflow-hidden rounded-[11px] border px-3.5 py-3"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[.08em]" style={{ color: "var(--ink3)" }}>
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
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest(".locked-cost-trigger")) {
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
      <h4 className="mb-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Proposal Cost</h4>
      <label className="mb-1 block text-[10px]" style={{ color: "var(--ink3)" }}>Proposal Cost</label>
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
      <label className="mb-1 block text-[10px]" style={{ color: "var(--ink3)" }}>+ Reimbursement</label>
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
        Total: {"\u20b9"}{fmt(total)}
      </div>
      <button type="button" onClick={onClose} className="w-full rounded-[7px] py-[7px] text-xs font-semibold text-white" style={{ background: "var(--am)" }}>
        Done
      </button>
    </div>
  );
}

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

// Preview + send the "forward locked creators" digest. Shows exactly what
// the email will contain before anything opens, so there's no surprise
// when the mail app pops up.
function ForwardDigestModal({ campaign, lockedRows, senderEmail, onClose, onSent }) {
  const total = lockedRows.reduce((sum, r) => sum + parseAmount(r.brandFinalCost) || parseAmount(r.brandLockedCost), 0);

  function handleSend() {
    const brandName = campaign.brandClient || campaign.client || "Brand";
    const campaignMonth = campaign.timelineStart
      ? new Date(campaign.timelineStart).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      : "";

    const subject = `Profile Confirmation \u2013 ${brandName} | ${campaignMonth}`;

    const profileBlocks = lockedRows.map((r, i) => {
      const price = parseAmount(r.brandFinalCost) || parseAmount(r.brandLockedCost);
      return [
        `${i + 1}. ${r.name}`,
        `Channel Link: ${r.profileLink || ""}`,
        `Deliverables: ${r.deliverables || ""}`,
        `Price: \u20b9${fmt(price)}`,
        `Language: ${r.language || ""}`,
      ].join("\n");
    });

    const body = [
      `Hi ,`,
      ``,
      `I hope you\u2019re doing well.`,
      ``,
      `As discussed, we are proceeding with the below creator profiles for the ${campaignMonth} campaign.`,
      ``,
      `Profile Details`,
      ...profileBlocks.flatMap((block) => [block, ""]),
      `Confirmation`,
      ``,
      `Request you to please review the above profiles and share your acknowledgement. Your acknowledgement will be considered as confirmation of the mentioned profiles and agreed deliverables.`,
      ``,
      `Looking forward to building ${brandName} together.`,
      ``,
      `Best,`,
      senderEmail || "",
      `Curious Media || (website link)`,
    ].join("\n");

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onSent();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,36,62,.45)" }}>
      <div
        className="w-full max-w-md rounded-[16px] border p-6 shadow-[0_20px_60px_rgba(16,36,62,.3)]"
        style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}>
              Forward to brand
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink3)" }}>
              Opens your email app with this list pre-filled — you review and send it yourself.
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]" style={{ color: "var(--ink3)" }}>
            <X size={16} />
          </button>
        </div>

        {lockedRows.length === 0 ? (
          <div className="rounded-[10px] border p-4 text-center text-sm" style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}>
            No creators are locked yet — lock at least one before forwarding.
          </div>
        ) : (
          <>
            <div className="mb-4 max-h-[280px] overflow-auto rounded-[10px] border" style={{ borderColor: LOCK_BORDER }}>
              {lockedRows.map((r, i) => {
                const cost = parseAmount(r.brandFinalCost) || parseAmount(r.brandLockedCost);
                return (
                  <div
                    key={r.creatorId}
                    className="flex items-center justify-between px-3.5 py-2.5 text-sm"
                    style={{
                      background: i % 2 === 0 ? LOCK_WASH : "transparent",
                      borderTop: i === 0 ? "none" : `1px solid ${LOCK_BORDER}`,
                    }}
                  >
                    <span style={{ color: "var(--ink)" }}>{r.name}</span>
                    <span style={{ color: LOCK_COLOR, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {"\u20b9"}{fmt(cost)}
                    </span>
                  </div>
                );
              })}
              <div
                className="flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold"
                style={{ borderTop: `1px solid ${LOCK_BORDER}`, color: "var(--ink)" }}
              >
                <span>Total</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{"\u20b9"}{fmt(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSend}
              className="flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--am)" }}
            >
              <Send size={14} />
              Open email draft
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function BrandDashboard() {
  const { token: campaignId } = useParams();
  const [searchParams] = useSearchParams();
  // Old links (shared before templates existed) had no ?template= at
  // all — defaulting to "full" means they keep working exactly as they
  // always did, showing everything.
  const template = searchParams.get("template") === "simple" ? "simple" : "full";
  return <BrandDashboardView key={campaignId} campaignId={campaignId} template={template} />;
}

// Confirms before locking — locking is permanent, so this is the one and
// only chance to back out.
function ConfirmLockModal({ creatorName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,36,62,.45)" }}>
      <div
        className="w-full max-w-sm rounded-[16px] border p-6 text-center shadow-[0_20px_60px_rgba(16,36,62,.3)]"
        style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: LOCK_WASH }}>
          <Lock size={20} style={{ color: LOCK_COLOR }} />
        </div>
        <h3 className="mb-1.5 text-base font-semibold" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}>
          Lock {creatorName}?
        </h3>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--ink2)" }}>
          Locking a creator freezes their Final Cost, and the lock stays permanent — this is the final step in
          confirming them.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[9px] border py-2.5 text-sm font-medium"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-semibold text-white"
            style={{ background: LOCK_COLOR }}
          >
            Yes, lock it
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandDashboardView({ campaignId, template }) {
  const isSimple = template === "simple";
  const { user, signOut } = useBrandAuth();
  const [data, setData] = useState(undefined);
  const [theme, setTheme] = useState(loadBrandTheme);
  const [digestOpen, setDigestOpen] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [confirmLockRow, setConfirmLockRow] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: result, error } = await supabaseBrand.rpc("get_brand_dashboard", { p_campaign_id: campaignId });
      if (cancelled) return;

      // If this failed specifically because the session isn't valid
      // anymore (expired, or never was), that's not a broken link — it's
      // just "please log in again." Signing out here clears the stale
      // session, which makes BrandAuthGate correctly show the login
      // screen instead of this page ever showing a "link not valid"
      // message that isn't actually true.
      if (error?.message?.toLowerCase().includes("not authorized")) {
        await signOut();
        return;
      }

      if (error || !result || !result.campaign) {
        console.error("Failed to load brand dashboard:", error?.message);
        setData(null);
        return;
      }
      setData(result);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    try {
      localStorage.setItem(BRAND_THEME_KEY, theme);
    } catch {
      // Ignore — theme just won't persist across reloads.
    }
  }, [theme]);

  function updateLinkField(creatorId, field, value) {
    const previousRow = data.rows.find((r) => r.creatorId === creatorId);
    const errorKey = `${creatorId}:${field}`;
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.creatorId === creatorId ? { ...r, [field]: value } : r)),
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
    supabaseBrand
      .rpc("update_brand_dashboard_link", { p_campaign_id: campaignId, p_creator_id: creatorId, p_field: field, p_value: String(value) })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to save brand dashboard change:", error.message);
          // The server refused this (e.g. Final Cost below Last Cost,
          // already locked) — undo the optimistic change and show the
          // reason right under the field itself, not as a generic
          // page-level banner.
          setData((prev) => ({
            ...prev,
            rows: prev.rows.map((r) => (r.creatorId === creatorId ? previousRow : r)),
          }));
          setFieldErrors((prev) => ({ ...prev, [errorKey]: error.message || "Couldn't save that change." }));
          setTimeout(() => {
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next[errorKey];
              return next;
            });
          }, 5000);
        }
      });
  }

  function updateMetaField(field, value) {
    setData((prev) => ({ ...prev, campaign: { ...prev.campaign, [field]: value } }));
    supabaseBrand
      .rpc("update_brand_dashboard_meta", { p_campaign_id: campaignId, p_field: field, p_value: String(value) })
      .then(({ error }) => { if (error) console.error("Failed to save brand dashboard change:", error.message); });
  }

  // Client always shows whoever the logged-in brand person actually is —
  // every time they open this, not just once. Only fires for a genuine
  // brand login, never for a staff member previewing (they don't have a
  // "brand name" to fill in with).
  useEffect(() => {
    if (!data || !data.campaign) return;
    if (!data.campaign.isBrandViewer) return;
    const name = data.campaign.brandUserName;
    if (name && data.campaign.brandClient !== name) {
      updateMetaField("brandClient", name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.campaign?.isBrandViewer, data?.campaign?.brandUserName]);

  function handleDigestSent() {
    setDigestOpen(false);
    setJustSent(true);
    setTimeout(() => setJustSent(false), 3000);
  }

  function handleConfirmLock() {
    if (!confirmLockRow) return;
    updateLinkField(confirmLockRow.creatorId, "brandLocked", true);
    logActivity(user, "creator_locked", { creatorName: confirmLockRow.name, campaignName: campaign.name }, supabaseBrand);
    setConfirmLockRow(null);
  }

  // Flat list of every row, always safe to compute (no early return above
  // this, per React's Rules of Hooks).
  const rows = useMemo(() => (data && data.rows) || [], [data]);

  // Grouped into real date sections — newest first — instead of a
  // binary "new" flag that only meant anything relative to whenever
  // someone happened to click Forward. This is clearer: every creator
  // sits under the actual day (and shows the actual time) they were
  // added, permanently, not relative to an arbitrary click.
  const groupedRows = useMemo(() => {
    const groups = new Map();
    rows.forEach((r) => {
      const d = r.createdAt ? new Date(r.createdAt) : null;
      const dateKey = d ? d.toISOString().slice(0, 10) : "unknown";
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey).push(r);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, groupRows]) => ({
        dateKey,
        label:
          dateKey === "unknown"
            ? "Date unknown"
            : new Date(dateKey).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
        rows: groupRows,
      }));
  }, [rows]);

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
          <h1 className="mb-1.5 text-lg font-semibold" style={{ fontFamily: "Fraunces, serif" }}>Link not valid</h1>
          <p className="text-sm" style={{ color: "#5B6B82" }}>
            This dashboard link is broken or the campaign no longer exists. Ask for a fresh link from the campaign owner.
          </p>
        </div>
      </div>
    );
  }

  const { campaign } = data;

  const linksPosted = rows.reduce((sum, r) => sum + (Array.isArray(r.liveLinks) ? r.liveLinks.length : 0), 0);
  const linksExpected = Number(campaign.linksExpected) || rows.length;
  const lockedRows = rows.filter((r) => r.brandLocked);

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

      {digestOpen && (
        <ForwardDigestModal
          campaign={campaign}
          lockedRows={lockedRows}
          senderEmail={user?.email}
          onClose={() => setDigestOpen(false)}
          onSent={handleDigestSent}
        />
      )}

      {confirmLockRow && (
        <ConfirmLockModal
          creatorName={confirmLockRow.name}
          onConfirm={handleConfirmLock}
          onCancel={() => setConfirmLockRow(null)}
        />
      )}

      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[.1em]" style={{ color: "var(--am)", fontFamily: "'JetBrains Mono', monospace" }}>
              Brand Dashboard
            </div>
            <h1 className="mt-1 text-[32px] font-semibold" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {campaign.name}
            </h1>
            {user?.email && (
              <div className="mt-1 text-[11px]" style={{ color: "var(--ink3)" }}>
                Signed in as {user.email}
                {campaign.isBrandViewer ? " (brand)" : " (team preview)"}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
          <div className="no-print flex items-center gap-2">
            {justSent && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium" style={{ background: "rgba(43,174,102,.1)", color: "#2BAE66" }}>
                <CheckCircle2 size={13} />
                Draft opened
              </span>
            )}
            <button
              type="button"
              onClick={() => downloadCsv(`${campaign.name || "brand-dashboard"}.csv`, brandDashboardToCsv(rows))}
              className="flex items-center gap-1.5 rounded-[9px] border px-3 py-2 text-[12px] font-medium transition-colors"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
            >
              <Download size={13} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border transition-colors"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {!campaign.isBrandViewer && (
              <button
                type="button"
                onClick={() => setDigestOpen(true)}
                className="flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_2px_10px_rgba(30,111,224,.35)] transition-transform hover:-translate-y-[1px]"
                style={{ background: "var(--am)" }}
              >
                <Send size={13} />
                Forward locked creators
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border transition-colors"
              style={{ borderColor: "var(--ln)", color: "#E0524B", background: "var(--panel)" }}
            >
              <LogOut size={14} />
            </button>
          </div>
          {user?.email && <UserAvatar email={user.email} avatarUrl={user.user_metadata?.avatar_url} size={48} />}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <SlabCard label="Client">{campaign.brandClient || campaign.client || "\u2014"}</SlabCard>
          {!isSimple && (
            <SlabCard label={"Budget (\u20b9)"}>{fmt(campaign.brandBudget || 0)}</SlabCard>
          )}
          <SlabCard label="Timeline" editable type="date" value={campaign.brandTimelineEnd} onChange={(v) => updateMetaField("brandTimelineEnd", v)} />
          <SlabCard label="Links Posted">{linksPosted}/{linksExpected}</SlabCard>
          <SlabCard label="Locked Profiles">
            <span style={{ color: LOCK_COLOR }}>{lockedRows.length}</span>
          </SlabCard>
          <SlabCard label="Point of Contact (POC)" editable value={campaign.brandPoc} onChange={(v) => updateMetaField("brandPoc", v)} placeholder={campaign.poc || "\u2014"} />
        </div>

        <div className="overflow-auto rounded-[14px] border" style={{ background: "var(--panel)", borderColor: "var(--ln)" }}>
          <table className="w-full border-collapse text-sm" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                {[
                  "Creator",
                  "Followers",
                  "Deliverables",
                  ...(!isSimple ? ["Proposal Cost", "Counter Cost", "Last Cost", "Final Cost"] : []),
                  "Remarks",
                  "Locked Status",
                  "Execution Stage",
                  "Live Video Link",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[.07em]"
                    style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--bg)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => (
                <Fragment key={group.dateKey}>
                  <tr>
                    <td
                      colSpan={isSimple ? 7 : 11}
                      className="border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-[.06em]"
                      style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
                    >
                      Added {group.label}
                    </td>
                  </tr>
                  {group.rows.map((row) => {
                    const stageColor = EXECUTION_STAGE_COLORS[row.executionStage] || "#8FA3BC";
                    const addedTime = row.createdAt
                      ? new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
                      : null;

                    return (
                      <tr key={row.creatorId}>
                        <td className="whitespace-nowrap border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                          <div className="flex flex-col gap-0.5">
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
                            {addedTime && (
                              <span className="text-[10px]" style={{ color: "var(--ink3)" }}>{addedTime}</span>
                            )}
                          </div>
                        </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)", color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmt(row.followers)}
                    </td>

                    <td className="border-b px-4 py-3 text-[12px]" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                      {row.deliverables || <span style={{ color: "var(--ink3)" }}>{"\u2014"}</span>}
                    </td>

                    {!isSimple && (
                      <>
                        <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                          {campaign.isBrandViewer ? (
                            <span
                              className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px]"
                              style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--bg)", fontFamily: "'JetBrains Mono', monospace" }}
                              title="Only your team can edit this"
                            >
                              {"\u20b9"}{fmt(parseAmount(row.brandLockedCost) + parseAmount(row.brandReimbursement))}
                            </span>
                          ) : (
                            <LockedCostCell
                              lockedCost={row.brandLockedCost}
                              reimbursement={row.brandReimbursement}
                              onChange={(field, value) => updateLinkField(row.creatorId, field, value)}
                            />
                          )}
                        </td>

                        <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                          <div className="flex items-center gap-1">
                            <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                            <input
                              type="text"
                              value={row.brandCounterCost ?? ""}
                              onChange={(e) => updateLinkField(row.creatorId, "brandCounterCost", e.target.value)}
                              placeholder="0"
                              disabled={!campaign.isBrandViewer}
                              title={!campaign.isBrandViewer ? "Only the brand can edit this" : undefined}
                              className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ borderColor: "var(--ln)", color: "var(--ink)", background: !campaign.isBrandViewer ? "var(--bg)" : "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                            />
                          </div>
                        </td>

                        <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                          <div className="flex items-center gap-1">
                            <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                            <input
                              type="text"
                              value={row.brandLastCost ?? ""}
                              onChange={(e) => updateLinkField(row.creatorId, "brandLastCost", e.target.value)}
                              placeholder="0"
                              disabled={campaign.isBrandViewer}
                              title={campaign.isBrandViewer ? "Only your team can edit this" : undefined}
                              className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ borderColor: "var(--ln)", color: "var(--ink)", background: campaign.isBrandViewer ? "var(--bg)" : "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                            />
                          </div>
                        </td>

                        <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                              <input
                                type="text"
                                value={row.brandFinalCost ?? ""}
                                onChange={(e) => updateLinkField(row.creatorId, "brandFinalCost", e.target.value)}
                                placeholder="0"
                                disabled={row.brandLocked || !campaign.isBrandViewer}
                                title={
                                  row.brandLocked
                                    ? "Frozen — this creator is locked"
                                    : !campaign.isBrandViewer
                                    ? "Only the brand can edit this"
                                    : undefined
                                }
                                className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ borderColor: "var(--ln)", color: "var(--ink)", background: row.brandLocked || !campaign.isBrandViewer ? "var(--bg)" : "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                              />
                            </div>
                            {fieldErrors[`${row.creatorId}:brandFinalCost`] && (
                              <span className="max-w-[150px] text-[10px] leading-tight" style={{ color: "#E0524B" }}>
                                {fieldErrors[`${row.creatorId}:brandFinalCost`]}
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}

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
                      {row.brandLocked ? (
                        <span
                          title="Locked permanently — cannot be undone"
                          className="flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                          style={{ borderColor: LOCK_COLOR, color: LOCK_COLOR, background: LOCK_WASH }}
                        >
                          <Lock size={11} />
                          Locked
                        </span>
                      ) : campaign.isBrandViewer ? (
                        !isSimple && !row.brandFinalCost ? (
                          <span
                            title="Enter a Final Cost before this can be locked"
                            className="flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium opacity-60"
                            style={{ borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--up)" }}
                          >
                            <Unlock size={11} />
                            Unlocked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmLockRow(row)}
                            className="flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                            style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--up)" }}
                          >
                            <Unlock size={11} />
                            Unlocked
                          </button>
                        )
                      ) : (
                        <span
                          title="Only the brand can lock a creator"
                          className="flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium opacity-60"
                          style={{ borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--up)" }}
                        >
                          <Unlock size={11} />
                          Unlocked
                        </span>
                      )}
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
                          <span className="text-[10.5px]" style={{ color: "var(--ink3)" }}>{fmtDate(row.liveDate)}</span>
                        )}
                      </div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      {row.liveLink && toHref(row.liveLink) ? (
                        <a href={toHref(row.liveLink)} target="_blank" rel="noreferrer" className="underline decoration-1 underline-offset-2" style={{ color: "var(--am)" }}>
                          View
                        </a>
                      ) : (
                        <span style={{ color: "var(--ink3)" }}>{"\u2014"}</span>
                      )}
                    </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
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