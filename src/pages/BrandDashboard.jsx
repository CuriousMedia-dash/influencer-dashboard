import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { decodeShareToken } from "../utils/shareLink";
import { fmt, hex2rgba, isUrl } from "../utils/format";
import { EXECUTION_STAGE_COLORS } from "../utils/constants";
import { Lock, Unlock, Sun, Moon, Download } from "lucide-react";

// Brand's own edits (prices, remarks, their own "locked" toggle, and the
// top summary fields) are stored in *their* browser only, keyed by this
// share token — there is no backend yet, so none of this syncs back to
// the agency's copy of the campaign, and nothing the agency changes later
// overwrites what the brand has already typed in here. Opening the same
// link again on the same device/browser restores these edits.
function storageKey(token) {
  return `cm_brand_dash_${token}`;
}

function loadBrandEdits(token) {
  try {
    const raw = localStorage.getItem(storageKey(token));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// The brand dashboard's light/dark toggle is entirely its own — separate
// from the main app's theme — so a brand viewer's preference here never
// depends on (or affects) anyone else's.
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

function fmtDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseAmount(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// Slab card used for the top summary row. Renders as a plain input when
// editable, or static text when it's a computed/derived value.
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

export default function BrandDashboard() {
  const { token } = useParams();
  return <BrandDashboardView key={token} token={token} />;
}

function BrandDashboardView({ token }) {
  const payload = useMemo(() => decodeShareToken(token), [token]);
  const [edits, setEdits] = useState(() => loadBrandEdits(token));
  const [theme, setTheme] = useState(loadBrandTheme);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(token), JSON.stringify(edits));
    } catch {
      // Ignore quota/availability errors — edits still work for this session.
    }
  }, [edits, token]);

  useEffect(() => {
    try {
      localStorage.setItem(BRAND_THEME_KEY, theme);
    } catch {
      // Ignore — theme just won't persist across reloads.
    }
  }, [theme]);

  if (!payload) {
    return (
      <div data-theme={theme} className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--bg-page)" }}>
        <div
          className="max-w-sm rounded-[14px] border p-6 text-center"
          style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
        >
          <h1 className="mb-1.5 text-lg font-semibold" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}>
            Link not valid
          </h1>
          <p className="text-sm" style={{ color: "var(--ink2)" }}>
            This dashboard link is broken or incomplete. Ask for a fresh link
            from the campaign owner.
          </p>
        </div>
      </div>
    );
  }

  function edit(creatorId) {
    const row = payload.rows.find((r) => r.creatorId === creatorId);
    const defaults = {
      reimbursement: "",
      brandLocked: false,
      lockedCost: row?.lp ?? "",
      counterCost: row?.cc ?? "",
      finalCost: row?.fc ?? "",
      remark: row?.remark ?? "",
      viewership: row?.viewership ?? "",
    };
    return { ...defaults, ...edits[creatorId] };
  }

  function updateEdit(creatorId, fields) {
    setEdits((prev) => ({
      ...prev,
      [creatorId]: { ...edit(creatorId), ...fields },
    }));
  }

  const meta = {
    client: payload.client,
    budget: payload.budget,
    timelineStart: payload.timelineStart,
    timelineEnd: payload.timelineEnd,
    poc: payload.poc,
    ...edits.__meta,
  };

  function updateMeta(fields) {
    setEdits((prev) => ({ ...prev, __meta: { ...meta, ...fields } }));
  }

  const linksPosted = payload.rows.filter((r) => r.liveLink).length;
  const linksExpected = Number(payload.linksExpected) || payload.rows.length;
  const lockedProfilesCount = payload.rows.filter((r) => edit(r.creatorId).brandLocked).length;

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
          <div
            className="text-[11px] uppercase tracking-[.13em]"
            style={{ color: "var(--ink3)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {payload.generatedAt ? fmtDate(payload.generatedAt) : ""}
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
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
            >
              <Download size={13} />
              Download PDF
            </button>
          </div>
        </div>

        <h1
          className="mb-5 text-[28px] font-semibold"
          style={{ fontFamily: "Fraunces, serif", color: "var(--ink)", letterSpacing: "-0.01em" }}
        >
          {payload.name}
        </h1>

        {/* Top slab — editable except the two computed metrics */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <SlabCard label="Client" editable value={meta.client} onChange={(v) => updateMeta({ client: v })} placeholder="—" />

          <SlabCard label="Budget (₹)" editable type="number" value={meta.budget} onChange={(v) => updateMeta({ budget: v })} placeholder="0" />

          <SlabCard
            label="Timeline"
            editable
            type="date"
            value={meta.timelineEnd}
            onChange={(v) => updateMeta({ timelineEnd: v })}
          />

          <SlabCard label="Links Posted">
            {linksPosted}/{linksExpected}
          </SlabCard>

          <SlabCard label="Locked Profiles">{lockedProfilesCount}</SlabCard>

          <SlabCard label="Owner / POC" editable value={meta.poc} onChange={(v) => updateMeta({ poc: v })} placeholder="—" />
        </div>

        <div
          className="overflow-auto rounded-[13px] border"
          style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
        >
          <table className="w-full border-collapse text-sm" style={{ minWidth: 1180 }}>
            <thead>
              <tr>
                {[
                  "Creator",
                  "Followers",
                  "Locked Cost",
                  "Counter Cost",
                  "Final Cost",
                  "Remarks",
                  "Locked Status",
                  "Execution Stage",
                  "Live Video Link",
                  "Viewership",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b px-4 py-3 text-left text-[11px] uppercase tracking-[.06em]"
                    style={{ borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--bg)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.rows.map((row) => {
                const e = edit(row.creatorId);
                const stageColor = EXECUTION_STAGE_COLORS[row.executionStage] || "#8FA3BC";

                return (
                  <tr key={row.creatorId}>
                    {/* Creator — not editable */}
                    <td className="whitespace-nowrap border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      {row.link && isUrl(row.link) ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noreferrer"
                          title="View profile"
                          className="underline decoration-1 underline-offset-2"
                          style={{ color: "var(--am)" }}
                        >
                          {row.n}
                        </a>
                      ) : (
                        <span style={{ color: "var(--ink)" }}>{row.n}</span>
                      )}
                    </td>

                    {/* Followers — not editable */}
                    <td
                      className="border-b px-4 py-3"
                      style={{ borderColor: "var(--ln)", color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {fmt(row.f)}
                    </td>

                    {/* Locked Cost — editable, independent of the agency's own number */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                          <input
                            type="text"
                            value={e.lockedCost}
                            onChange={(ev) => updateEdit(row.creatorId, { lockedCost: ev.target.value })}
                            placeholder="0"
                            className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] font-semibold outline-none"
                            style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="whitespace-nowrap text-[10px]" style={{ color: "var(--ink3)" }}>
                            + Reimbursement
                          </span>
                          <input
                            type="text"
                            value={e.reimbursement}
                            onChange={(ev) => updateEdit(row.creatorId, { reimbursement: ev.target.value })}
                            placeholder="0"
                            className="w-16 rounded-[6px] border px-1.5 py-0.5 text-[11px] outline-none"
                            style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                          />
                        </div>
                        {(parseAmount(e.lockedCost) > 0 || parseAmount(e.reimbursement) > 0) && (
                          <span className="text-[10.5px]" style={{ color: "var(--ink2)" }}>
                            Total: {"\u20b9"}
                            {fmt(parseAmount(e.lockedCost) + parseAmount(e.reimbursement))}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Counter Cost — editable */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex items-center gap-1">
                        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                        <input
                          type="text"
                          value={e.counterCost}
                          onChange={(ev) => updateEdit(row.creatorId, { counterCost: ev.target.value })}
                          placeholder="0"
                          className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none"
                          style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </div>
                    </td>

                    {/* Final Cost — editable */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <div className="flex items-center gap-1">
                        <span style={{ color: "var(--ink3)" }}>{"\u20b9"}</span>
                        <input
                          type="text"
                          value={e.finalCost}
                          onChange={(ev) => updateEdit(row.creatorId, { finalCost: ev.target.value })}
                          placeholder="0"
                          className="w-20 rounded-[6px] border px-1.5 py-0.5 text-[12px] outline-none"
                          style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </div>
                    </td>

                    {/* Remarks — editable, roomy textarea so it isn't cramped */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <textarea
                        value={e.remark}
                        onChange={(ev) => updateEdit(row.creatorId, { remark: ev.target.value })}
                        placeholder="Add a remark…"
                        rows={2}
                        className="w-[190px] resize-y rounded-[6px] border px-2 py-1 text-[12px] outline-none"
                        style={{ borderColor: "var(--ln)", color: "var(--ink)", background: "var(--up)" }}
                      />
                    </td>

                    {/* Locked Status — brand's own toggle, independent of the agency's */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <button
                        type="button"
                        onClick={() => updateEdit(row.creatorId, { brandLocked: !e.brandLocked })}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                        style={
                          e.brandLocked
                            ? { borderColor: "#2BAE66", color: "#2BAE66", background: "rgba(43,174,102,.08)" }
                            : { borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--up)" }
                        }
                      >
                        {e.brandLocked ? <Lock size={11} /> : <Unlock size={11} />}
                        {e.brandLocked ? "Locked" : "Unlocked"}
                      </button>
                    </td>

                    {/* Execution Stage — not editable */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <span
                        className="inline-flex whitespace-nowrap rounded-full border px-2 py-[3px] text-[11px]"
                        style={{
                          color: stageColor,
                          borderColor: hex2rgba(stageColor, 0.35),
                          background: hex2rgba(stageColor, 0.08),
                        }}
                      >
                        {row.executionStage}
                      </span>
                    </td>

                    {/* Live Video Link — not editable */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      {row.liveLink && isUrl(row.liveLink) ? (
                        <a
                          href={row.liveLink}
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

                    {/* Viewership — editable */}
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--ln)" }}>
                      <input
                        type="text"
                        value={e.viewership}
                        onChange={(ev) => updateEdit(row.creatorId, { viewership: ev.target.value })}
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

          {payload.rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--ink3)" }}>
              No creators in this campaign yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
