import { useMemo, useRef, useState } from "react";
import { Lock, Unlock, X, ArrowUpDown, CreditCard, Mail, Pencil, Check, Flag } from "lucide-react";
import EditableCell from "../ui/EditableCell";
import EditPopover from "../ui/EditPopover";
import LockConfirmModal from "./LockConfirmModal";
import PaymentInfoDialog from "./PaymentInfoDialog";
import { fmt, hex2rgba, groupByPlatform, parseN, summarizePaymentInfo, isUrl } from "../../utils/format";
import { openPaymentEmail } from "../../utils/email";
import { useToast } from "../../hooks/useToast";
import {
  LANG_COLORS,
  NEGOTIATION_STATUSES,
  NEGOTIATION_STATUS_COLORS,
  EXECUTION_STAGES,
  EXECUTION_STAGE_COLORS,
  PLATFORM_ICONS,
  QUIT_FLAG_COLOR,
} from "../../utils/constants";

const SORT_OPTIONS = [
  { value: "none", label: "Default order" },
  { value: "liveDate", label: "Live date" },
  { value: "name", label: "Creator name" },
  { value: "platform", label: "Platform" },
  { value: "commercial", label: "Commercial" },
  { value: "negotiationStatus", label: "Negotiation status" },
];

// Single unified table — one row per creator per platform. Platform is its
// own column (with the platform icon) right after the name, so nothing is
// hidden behind a section header. The creator's name doubles as the link
// to their profile/deal link for that platform (with a pencil to edit it).
const COLS = [
  ["Name", 150],
  ["Platform", 110],
  ["Followers", 84],
  ["Phone", 120],
  ["Email", 170],
  ["Negotiation Status", 140],
  ["Commercial", 100],
  ["Locked Price", 100],
  ["Counter Cost", 100],
  ["Final Cost", 100],
  ["Viewership", 100],
  ["Locked Status", 96],
  ["Execution Stage", 150],
  ["Live Video Link", 120],
  ["Payment Info", 230],
  ["Remark", 200],
  ["", 40],
];

/**
 * Name cell: creator's name rendered as a clickable link (to that
 * platform's profile/deal link, if one is set), with a pencil to edit
 * the underlying link — mirrors EditableCell's edit-popover pattern but
 * shows the creator's name instead of a generic "Deal ↗" label.
 */
function NameLinkCell({ creator, link, onSaveLink }) {
  const [editing, setEditing] = useState(false);
  const anchorRef = useRef(null);
  const hasLink = Boolean(link);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {hasLink && isUrl(link) ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          title={link}
          className="edit-val block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium"
          style={{ color: "var(--am)" }}
        >
          {creator.name}
        </a>
      ) : (
        <span
          title={hasLink ? link : creator.name}
          className="edit-val block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium"
          style={{ color: "var(--ink)" }}
        >
          {creator.name}
        </span>
      )}

      <button
        ref={anchorRef}
        type="button"
        title="Edit profile link"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="edit-pencil flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border border-transparent p-0 transition-all"
        style={{ color: "var(--ink3)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--ln)";
          e.currentTarget.style.color = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.color = "var(--ink3)";
        }}
      >
        <Pencil size={11} />
      </button>

      {editing && (
        <EditPopover
          anchorRef={anchorRef}
          label="profile link"
          initialValue={link}
          useTextarea={false}
          onSave={(val) => {
            onSaveLink(val);
            setEditing(false);
          }}
          onClear={() => {
            onSaveLink("");
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/**
 * Single, unified table of every creator↔campaign link — no more
 * "Creators" vs "Payment Status" tabs. Platform is a plain column (with
 * icon) instead of a section header, so a creator on Instagram + YouTube
 * still shows as two rows, sitting right next to each other rather than
 * split across sections.
 */
export default function CampaignCreatorsTable({
  links,
  getCreatorById,
  onUpdateLink,
  onRemoveLink,
  onUpdateCreatorField,
  campaignName,
}) {
  const [sortBy, setSortBy] = useState("none");
  const [sortDir, setSortDir] = useState("asc");
  const [lockDialogCreatorId, setLockDialogCreatorId] = useState(null);
  const [paymentDialogCreatorId, setPaymentDialogCreatorId] = useState(null);
  const showToast = useToast();

  // Flatten to one row per platform per creator (reusing the existing
  // grouping helper just for its flattening behavior), then drop the
  // section grouping itself — platform now rides along on each row.
  const flatRows = useMemo(() => {
    const groups = groupByPlatform(links, (link) => getCreatorById(link.creatorId));
    return groups.flatMap((g) => g.rows);
  }, [links, getCreatorById]);

  const sortedRows = useMemo(() => {
    if (sortBy === "none") return flatRows;
    const rows = [...flatRows];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case "liveDate":
          av = a.item.liveDate || "";
          bv = b.item.liveDate || "";
          if (!av && !bv) return 0;
          if (!av) return 1;
          if (!bv) return -1;
          return av.localeCompare(bv) * dir;
        case "name":
          return a.creator.name.localeCompare(b.creator.name, undefined, { sensitivity: "base" }) * dir;
        case "platform":
          return (a.platform?.platform || "").localeCompare(b.platform?.platform || "") * dir;
        case "commercial":
          av = parseN(a.item.commercial);
          bv = parseN(b.item.commercial);
          return (av - bv) * dir;
        case "negotiationStatus":
          return a.item.negotiationStatus.localeCompare(b.item.negotiationStatus) * dir;
        default:
          return 0;
      }
    });
    return rows;
  }, [flatRows, sortBy, sortDir]);

  const lockDialogCreator = lockDialogCreatorId ? getCreatorById(lockDialogCreatorId) : null;
  const paymentDialogLink = paymentDialogCreatorId
    ? links.find((l) => l.creatorId === paymentDialogCreatorId)
    : null;
  const paymentDialogCreator = paymentDialogCreatorId ? getCreatorById(paymentDialogCreatorId) : null;

  function updateLink(creatorId, link) {
    onUpdateCreatorField(creatorId, "profileLink", link);
  }

  if (links.length === 0) {
    return (
      <div
        className="rounded-[13px] border px-5 py-[60px] text-center text-[13px] leading-[1.8]"
        style={{ background: "var(--panel)", borderColor: "var(--ln)", color: "var(--ink3)" }}
      >
        No creators added yet.
        <br />
        Select creators on the All Creators page and use "Move to Campaign".
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-end gap-2">
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink3)" }}>
          <ArrowUpDown size={12} />
          Sort by
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-[7px] border px-2 py-1.5 text-[11px] outline-none"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {sortBy !== "none" && (
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-[7px] border px-2.5 py-1.5 text-[11px]"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
            title="Toggle sort direction"
          >
            {sortDir === "asc" ? "Ascending" : "Descending"}
          </button>
        )}
      </div>

      <div
        className="overflow-auto rounded-[13px] border shadow-[0_1px_2px_rgba(16,36,62,.04)]"
        style={{ background: "var(--panel)", borderColor: "var(--ln)", maxHeight: 620 }}
      >
        <table className="table-fixed border-collapse text-xs" style={{ width: "100%", minWidth: 2050 }}>
          <thead>
            <tr>
              {COLS.map(([label, width]) => (
                <th
                  key={label || "actions"}
                  className="sticky top-0 z-10 whitespace-nowrap border-b px-3 py-2.5 text-left text-[10px] uppercase tracking-[.06em]"
                  style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink3)", width }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ item: link, creator, platform }) => {
              const lc = LANG_COLORS[creator.language] || "#1E6FE0";
              const locked = link.lockStatus === "locked";
              const negColor = NEGOTIATION_STATUS_COLORS[link.negotiationStatus] || "#8FA3BC";
              const stageColor = EXECUTION_STAGE_COLORS[link.executionStage] || "#8FA3BC";
              const isLiveStage = link.executionStage === "Live Video Date";
              const rowKey = `${link.creatorId}::${platform?.platform || "no-platform"}`;
              const stageQuit = link.executionStage === "Quit";
              const quit = Boolean(creator.quit) || stageQuit;

              return (
                <tr
                  key={rowKey}
                  style={
                    quit
                      ? { background: hex2rgba(QUIT_FLAG_COLOR, 0.1) }
                      : undefined
                  }
                >
                  <td className="overflow-hidden border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full" style={{ background: lc }} />
                      <NameLinkCell
                        creator={creator}
                        link={platform?.link || ""}
                        onSaveLink={(val) => updateLink(link.creatorId, val)}
                      />
                    </div>
                  </td>

                  <td className="overflow-hidden border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    {platform ? (
                      <span
                        className="inline-flex items-center gap-1.5 truncate rounded-full border px-2 py-[3px] text-[11px]"
                        style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
                      >
                        <span>{PLATFORM_ICONS[platform.platform] || "\ud83d\udd17"}</span>
                        {platform.platform}
                      </span>
                    ) : (
                      <span style={{ color: "var(--ink3)" }}>{"\u2014"}</span>
                    )}
                  </td>

                  <td
                    className="border-b px-3 py-2"
                    style={{ borderColor: "var(--ln)", color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {fmt(creator.followers)}
                  </td>

                  <td
                    className="overflow-hidden border-b px-3 py-2"
                    style={{ borderColor: "var(--ln)", color: "var(--ink2)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={creator.phone}>
                      {creator.phone || "\u2014"}
                    </span>
                  </td>

                  <td className="overflow-hidden border-b px-3 py-2" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={creator.email}>
                      {creator.email || "\u2014"}
                    </span>
                  </td>

                  <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <select
                      value={link.negotiationStatus}
                      onChange={(e) => onUpdateLink(link.creatorId, { negotiationStatus: e.target.value })}
                      className="w-full rounded-full border px-2 py-1 text-[11px] outline-none"
                      style={{
                        color: negColor,
                        borderColor: hex2rgba(negColor, 0.35),
                        background: hex2rgba(negColor, 0.08),
                      }}
                    >
                      {NEGOTIATION_STATUSES.map((s) => (
                        <option key={s} value={s} style={{ color: "#10243E" }}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <EditableCell
                      value={link.commercial}
                      label="Commercial"
                      variant="link"
                      onSave={(val) => onUpdateLink(link.creatorId, { commercial: val })}
                    />
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <EditableCell
                      value={link.lockedCost}
                      label="Locked price"
                      variant="plain"
                      onSave={(val) => onUpdateLink(link.creatorId, { lockedCost: val })}
                    />
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <EditableCell
                      value={link.counterCost}
                      label="Counter cost"
                      variant="plain"
                      onSave={(val) => onUpdateLink(link.creatorId, { counterCost: val })}
                    />
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <EditableCell
                      value={link.finalCost}
                      label="Final cost"
                      variant="plain"
                      onSave={(val) => onUpdateLink(link.creatorId, { finalCost: val })}
                    />
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <EditableCell
                      value={link.viewership}
                      label="Viewership"
                      variant="plain"
                      onSave={(val) => onUpdateLink(link.creatorId, { viewership: val })}
                    />
                  </td>

                  <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (locked) {
                          onUpdateLink(link.creatorId, { lockStatus: "unlocked" });
                        } else {
                          setLockDialogCreatorId(link.creatorId);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                      style={{
                        borderColor: locked ? "#2BAE66" : "var(--ln)",
                        color: locked ? "#2BAE66" : "var(--ink2)",
                        background: locked ? "rgba(43,174,102,.08)" : "var(--up)",
                      }}
                      title={
                        locked
                          ? `Locked \u2014 email sent: ${link.emailSent ? "yes" : "no"}, approval received: ${link.approvalReceived ? "yes" : "no"}. Click to unlock.`
                          : "Click to confirm & lock"
                      }
                    >
                      {locked ? <Lock size={11} /> : <Unlock size={11} />}
                      {locked ? "Locked" : "Unlocked"}
                    </button>
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <div className="flex flex-col gap-1">
                      <select
                        value={link.executionStage || "Draft Video"}
                        onChange={(e) => onUpdateLink(link.creatorId, { executionStage: e.target.value })}
                        className="w-full rounded-full border px-2 py-1 text-[11px] outline-none"
                        style={{
                          color: stageColor,
                          borderColor: hex2rgba(stageColor, 0.35),
                          background: hex2rgba(stageColor, 0.08),
                        }}
                      >
                        {EXECUTION_STAGES.map((s) => (
                          <option key={s} value={s} style={{ color: "#10243E" }}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {isLiveStage && (
                        <input
                          type="date"
                          value={link.liveDate || ""}
                          onChange={(e) => onUpdateLink(link.creatorId, { liveDate: e.target.value })}
                          className="w-full rounded-[6px] border px-1.5 py-1 text-[10px] outline-none"
                          style={{ borderColor: "var(--ln)", color: link.liveDate ? "var(--ink)" : "var(--ink3)" }}
                        />
                      )}
                    </div>
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <EditableCell
                      value={link.liveLink}
                      label="Live video link"
                      variant="link"
                      onSave={(val) => onUpdateLink(link.creatorId, { liveLink: val })}
                    />
                  </td>

                  <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentDialogCreatorId(link.creatorId)}
                        className="flex max-w-full items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                        style={
                          link.paymentInfo
                            ? { borderColor: "rgba(43,174,102,.35)", background: "rgba(43,174,102,.08)", color: "#2BAE66" }
                            : { borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--up)" }
                        }
                        title={link.paymentInfo ? "Edit payment info" : "Add payment info"}
                      >
                        <CreditCard size={11} />
                        <span className="truncate">
                          {link.paymentInfo ? summarizePaymentInfo(link.paymentInfo) : "Add payment info"}
                        </span>
                      </button>

                      {/* Advance payment */}
                      <div className="flex items-center gap-1">
                        <span
                          className="w-[34px] flex-shrink-0 text-[9px] font-semibold uppercase tracking-[.04em]"
                          style={{ color: "var(--ink3)" }}
                        >
                          Adv
                        </span>
                        <input
                          type="text"
                          value={link.advanceAmount || ""}
                          onChange={(e) => onUpdateLink(link.creatorId, { advanceAmount: e.target.value })}
                          placeholder="Amount"
                          className="w-0 min-w-0 flex-1 rounded-[6px] border px-1.5 py-1 text-[10px] outline-none"
                          style={{
                            borderColor: "var(--ln)",
                            color: "var(--ink)",
                            background: "var(--up)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateLink(link.creatorId, { advancePaid: !link.advancePaid })}
                          title={link.advancePaid ? "Mark advance as unpaid" : "Mark advance as paid"}
                          className="flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors"
                          style={
                            link.advancePaid
                              ? { borderColor: "#2BAE66", background: "rgba(43,174,102,.1)", color: "#2BAE66" }
                              : { borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--up)" }
                          }
                        >
                          {link.advancePaid && <Check size={10} />}
                          {link.advancePaid ? "Paid" : "Unpaid"}
                        </button>
                      </div>

                      {/* Full payment */}
                      <div className="flex items-center gap-1">
                        <span
                          className="w-[34px] flex-shrink-0 text-[9px] font-semibold uppercase tracking-[.04em]"
                          style={{ color: "var(--ink3)" }}
                        >
                          Full
                        </span>
                        <input
                          type="text"
                          value={link.fullAmount || ""}
                          onChange={(e) => onUpdateLink(link.creatorId, { fullAmount: e.target.value })}
                          placeholder="Amount"
                          className="w-0 min-w-0 flex-1 rounded-[6px] border px-1.5 py-1 text-[10px] outline-none"
                          style={{
                            borderColor: "var(--ln)",
                            color: "var(--ink)",
                            background: "var(--up)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateLink(link.creatorId, { fullPaid: !link.fullPaid })}
                          title={link.fullPaid ? "Mark full payment as unpaid" : "Mark full payment as paid"}
                          className="flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors"
                          style={
                            link.fullPaid
                              ? { borderColor: "#2BAE66", background: "rgba(43,174,102,.1)", color: "#2BAE66" }
                              : { borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--up)" }
                          }
                        >
                          {link.fullPaid && <Check size={10} />}
                          {link.fullPaid ? "Paid" : "Unpaid"}
                        </button>
                        <button
                          type="button"
                          title="Open email draft with payment details"
                          onClick={async () => {
                            const { clipboardCopied } = await openPaymentEmail({
                              to: "",
                              creator,
                              campaignName,
                              amount: link.commercial,
                              paymentInfo: link.paymentInfo,
                            });
                            showToast(
                              clipboardCopied
                                ? "Email app opened — details also copied to clipboard as backup"
                                : "Email app opened with the payment details",
                              true
                            );
                          }}
                          className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors"
                          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                        >
                          <Mail size={10} />
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="overflow-visible border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                    <div className="flex min-w-0 flex-col items-end gap-1">
                      <EditableCell
                        value={link.remark}
                        label="Remark"
                        variant="pill"
                        onSave={(val) => onUpdateLink(link.creatorId, { remark: val })}
                      />
                      <button
                        type="button"
                        title={
                          stageQuit
                            ? "Execution stage is set to Quit"
                            : quit
                            ? "Flagged — click to unflag"
                            : "Flag this creator"
                        }
                        onClick={() => !stageQuit && onUpdateCreatorField(link.creatorId, "quit", !quit)}
                        disabled={stageQuit}
                        className="flex h-[20px] w-fit flex-shrink-0 items-center gap-1 rounded-[6px] border px-1.5 transition-colors disabled:cursor-not-allowed"
                        style={
                          quit
                            ? { borderColor: QUIT_FLAG_COLOR, background: hex2rgba(QUIT_FLAG_COLOR, 0.12), color: QUIT_FLAG_COLOR }
                            : { borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--up)" }
                        }
                      >
                        <Flag size={11} fill={quit ? QUIT_FLAG_COLOR : "none"} />
                        <span className="text-[10px]">Flag</span>
                      </button>
                    </div>
                  </td>

                  <td className="border-b px-3 py-2 text-right" style={{ borderColor: "var(--ln)" }}>
                    <button
                      type="button"
                      title="Remove from campaign"
                      onClick={() => onRemoveLink(link.creatorId)}
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border transition-colors"
                      style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LockConfirmModal
        open={Boolean(lockDialogCreatorId)}
        onClose={() => setLockDialogCreatorId(null)}
        creatorName={lockDialogCreator?.name}
        onConfirm={({ emailSent, approvalReceived }) => {
          onUpdateLink(lockDialogCreatorId, {
            lockStatus: "locked",
            emailSent,
            approvalReceived,
          });
          setLockDialogCreatorId(null);
        }}
      />

      <PaymentInfoDialog
        key={paymentDialogCreatorId || "none"}
        open={Boolean(paymentDialogCreatorId)}
        onClose={() => setPaymentDialogCreatorId(null)}
        creator={paymentDialogCreator}
        campaignName={campaignName}
        amount={paymentDialogLink?.commercial}
        initialPaymentInfo={paymentDialogLink?.paymentInfo}
        onSave={(paymentInfo) => onUpdateLink(paymentDialogCreatorId, { paymentInfo })}
      />
    </div>
  );
}
