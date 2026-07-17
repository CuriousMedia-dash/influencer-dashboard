import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import Modal from "../ui/Modal";
import { parseCsvImport, mergeCreators } from "../../utils/csvImport";
import { excelFileToCsv, isExcelFile } from "../../utils/xlsxImport";
import { useCreators } from "../../hooks/useCreators";
import { useToast } from "../../hooks/useToast";
import { timeAgo } from "../../utils/format";

const STAGES = {
  IDLE: "idle",         // waiting for file pick
  ERRORS: "errors",     // file has validation errors — show them
  PREVIEW: "preview",   // file is valid — show summary before confirming
  DONE: "done",         // import complete
};

const TABS = { UPLOAD: "upload", LINK: "link", IMPORT: "import" };

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2 text-xs font-medium transition-colors"
      style={
        active
          ? { background: "var(--panel)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(16,36,62,.08)" }
          : { background: "transparent", color: "var(--ink3)" }
      }
    >
      {icon}
      {label}
    </button>
  );
}

export default function ImportCreatorsModal({ open, onClose }) {
  const {
    creators,
    setCreators,
    sheetLink,
    syncStatus,
    syncNow,
    unlinkSheet,
    setSheetMirror,
    importFromSheet,
    isAdmin,
  } = useCreators();
  const showToast = useToast();
  const fileRef = useRef(null);

  const [tab, setTab] = useState(TABS.UPLOAD);

  // ── Upload-file state ──
  const [stage, setStage] = useState(STAGES.IDLE);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null); // { added, skipped, merged }

  // ── Live sheet link state ── (the linked sheet itself + its sync status
  // live in CreatorsContext, shared with the header status pill and the
  // background auto-sync, so this modal is just a view onto that state)
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [syncSummary, setSyncSummary] = useState(null); // { added, updated, removed }
  const [mirrorMode, setMirrorMode] = useState(() => Boolean(sheetLink?.mirror));
  const [editingLink, setEditingLink] = useState(false);
  const [linkType, setLinkType] = useState(() => sheetLink?.type || "excel");
  const syncing = syncStatus === "syncing";

  // ── One-time "add creators from another sheet" state ──
  const [importLinkInput, setImportLinkInput] = useState("");
  const [importLinkType, setImportLinkType] = useState("excel");
  const [importRunError, setImportRunError] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);

  function reset() {
    setStage(STAGES.IDLE);
    setFileName("");
    setErrors([]);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    setLinkError("");
    setSyncSummary(null);
    setEditingLink(false);
    onClose();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStage(STAGES.IDLE);
    setErrors([]);
    setPreview(null);

    let text;
    try {
      text = isExcelFile(file) ? await excelFileToCsv(file) : await file.text();
    } catch (err) {
      setErrors([{ message: `Couldn't read that file: ${err.message || "unknown error"}` }]);
      setStage(STAGES.ERRORS);
      return;
    }

    const { rows, errors: parseErrors } = parseCsvImport(text);

    setErrors(parseErrors);

    if (rows.length === 0) {
      // Nothing usable at all — nothing to preview/import.
      setStage(STAGES.ERRORS);
      return;
    }

    // Build the preview from whatever rows parsed cleanly; rows with
    // errors are already excluded from `rows` and just get listed above.
    const { merged, added, skipped } = mergeCreators(creators, rows);
    setPreview({ merged, added, skipped });
    setStage(STAGES.PREVIEW);
  }

  function handleConfirmImport() {
    if (!preview) return;
    setCreators(preview.merged);
    const skippedRowsNote = errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} had errors and were skipped` : "";
    showToast(
      `${preview.added} creator${preview.added === 1 ? "" : "s"} added, ${preview.skipped} skipped (duplicate name + phone + platform)${skippedRowsNote}`,
      true
    );
    reset();
    onClose();
  }

  // ── Live sheet link handlers ── (delegate to the shared syncNow/unlinkSheet
  // in CreatorsContext — same function the silent background auto-sync
  // uses — so behavior is identical and the header pill stays in sync)
  async function runSync(rawUrl, type) {
    setLinkError("");
    setSyncSummary(null);
    try {
      const { added, updated, removed, rowErrors } = await syncNow(rawUrl, { mirror: mirrorMode, type });
      setEditingLink(false);
      setSyncSummary({ added, updated, removed, rowErrors });
      showToast(
        `Synced: ${added} added, ${updated} updated` +
          (mirrorMode ? `, ${removed} removed` : "") +
          (rowErrors.length > 0 ? `, ${rowErrors.length} row${rowErrors.length === 1 ? "" : "s"} skipped (errors)` : ""),
        true
      );
    } catch (err) {
      setLinkError(err.message || "Something went wrong while syncing.");
    }
  }

  function handleConnect() {
    if (!linkInput.trim()) return;
    runSync(linkInput.trim(), linkType);
  }

  function handleSyncNow() {
    if (!sheetLink?.url) return;
    // Re-syncs using whatever type the link was originally connected as —
    // not whatever the toggle currently shows, since that's only for
    // connecting a new/different link.
    runSync(sheetLink.url, sheetLink.type || "google_sheet");
  }

  function handleUnlink() {
    unlinkSheet();
    setLinkInput("");
    setSyncSummary(null);
    setLinkError("");
    setEditingLink(false);
  }

  function handleStartChangeLink() {
    setLinkInput(sheetLink?.url || "");
    setLinkError("");
    setSyncSummary(null);
    setEditingLink(true);
  }

  function handleCancelChangeLink() {
    setEditingLink(false);
    setLinkInput("");
    setLinkError("");
  }

  async function handleImportFromSheet() {
    if (!importLinkInput.trim()) return;
    setImporting(true);
    setImportRunError("");
    setImportSummary(null);
    try {
      const { added, updated, rowErrors } = await importFromSheet(importLinkInput.trim(), { type: importLinkType });
      setImportSummary({ added, updated, rowErrors });
      showToast(`${added} creator${added === 1 ? "" : "s"} added, ${updated} updated from that sheet`, true);
    } catch (err) {
      setImportRunError(err.message || "Something went wrong while importing.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Creators"
      description={
        tab === TABS.UPLOAD
          ? "Export your Google Sheet as a CSV file (File → Download → CSV) then upload it here. A row matching an existing creator's name + phone + platform will be skipped as a duplicate — the same person on 2 platforms is kept as 2 entries."
          : tab === TABS.LINK
          ? "This is the one master sheet the whole team syncs from — everyone sees the same data. Rows are matched by name + phone + platform."
          : "Pull creators in from a different sheet, one time. This adds to the master list above without changing which sheet it stays linked to."
      }
      maxWidth={520}
    >
      {/* ── Tabs ── */}
      <div
        className="mb-4 flex gap-1 rounded-[9px] p-1"
        style={{ background: "var(--up)" }}
      >
        <TabButton
          active={tab === TABS.UPLOAD}
          onClick={() => setTab(TABS.UPLOAD)}
          icon={<Upload size={13} />}
          label="Upload file"
        />
        <TabButton
          active={tab === TABS.LINK}
          onClick={() => setTab(TABS.LINK)}
          icon={<Link2 size={13} />}
          label="Master sheet"
        />
        {isAdmin && (
          <TabButton
            active={tab === TABS.IMPORT}
            onClick={() => setTab(TABS.IMPORT)}
            icon={<Upload size={13} />}
            label="Add more"
          />
        )}
      </div>

      {tab === TABS.UPLOAD && (
        <>
          {/* ── File picker ── */}
          <div
            className="mb-4 flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-5 py-7 text-center transition-colors"
            style={{ borderColor: "var(--ln)", background: "var(--up)" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && fileRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileRef.current.files = dt.files;
                handleFileChange({ target: fileRef.current });
              }
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(30,111,224,.10)" }}
            >
              <Upload size={20} style={{ color: "var(--am)" }} />
            </div>

            <div className="text-sm" style={{ color: "var(--ink2)" }}>
              {fileName ? (
                <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--ink)" }}>
                  <FileText size={14} />
                  {fileName}
                </span>
              ) : (
                <>Drag & drop your Excel or CSV file here, or</>
              )}
            </div>

            <label
              className="cursor-pointer rounded-[7px] border px-3.5 py-[7px] text-xs font-medium transition-colors"
              style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
            >
              {fileName ? "Choose a different file" : "Choose file"}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            <p className="text-[11px]" style={{ color: "var(--ink3)" }}>
              .xlsx, .xls, or .csv \u2014 works with an Excel export or a Google Sheets export
            </p>
          </div>

          {/* ── Validation errors ── */}
          {errors.length > 0 && (
            <div
              className="mb-4 rounded-[10px] border p-3.5"
              style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)" }}
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#E0524B" }}>
                <AlertCircle size={15} />
                {stage === STAGES.PREVIEW
                  ? `${errors.length} row${errors.length === 1 ? "" : "s"} skipped due to errors`
                  : "Fix these errors before importing"}
              </div>
              <div className="flex max-h-[200px] flex-col gap-1.5 overflow-auto">
                {errors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-[7px] border px-2.5 py-2 text-xs"
                    style={{ borderColor: "rgba(224,82,75,.2)", background: "rgba(224,82,75,.04)", color: "#E0524B" }}
                  >
                    {err.rowNum ? (
                      <span className="font-semibold">Row {err.rowNum} {err.name ? `(${err.name})` : ""}: </span>
                    ) : null}
                    {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Import preview / confirmation ── */}
          {stage === STAGES.PREVIEW && preview && (
            <div
              className="mb-4 rounded-[10px] border p-3.5"
              style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)" }}
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#2BAE66" }}>
                <CheckCircle2 size={15} />
                Ready to import
              </div>
              <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink2)" }}>
                <div>
                  <span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {preview.added}
                  </span>{" "}
                  creator{preview.added === 1 ? "" : "s"} will be added
                </div>
                {preview.skipped > 0 && (
                  <div>
                    <span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {preview.skipped}
                    </span>{" "}
                    skipped — same name + phone + platform already exists
                  </div>
                )}
                <div className="mt-1" style={{ color: "var(--ink3)" }}>
                  List will be sorted A–Z by name after import.
                </div>
              </div>
            </div>
          )}

          {/* ── Expected CSV format hint ── */}
          {stage === STAGES.IDLE && (
            <div
              className="mb-4 rounded-[10px] border p-3 text-[11px] leading-relaxed"
              style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}
            >
              <div className="mb-1 font-semibold" style={{ color: "var(--ink2)" }}>Expected column headers (row 1 of your sheet):</div>
              <code
                className="block rounded-[6px] px-2.5 py-1.5"
                style={{ background: "var(--up)", color: "var(--ink2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
              >
                Name, Phone, Email, Gender, Niche, Language, Followers, Instagram Link, YouTube Link, Twitter Link, LinkedIn Link
              </code>
              <div className="mt-1.5">
                One row per platform per creator — a creator on Instagram + YouTube becomes 2 entries. Use per-platform link columns (leave blank if they're not on it), or a single "Platform" + "Link" column pair for one-platform-per-row sheets.
              </div>
              <div className="mt-1.5">
                Followers can be plain numbers (<span style={{ fontFamily: "monospace" }}>950000</span>) or formatted (<span style={{ fontFamily: "monospace" }}>950K</span>, <span style={{ fontFamily: "monospace" }}>1.2M</span>).
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            {stage === STAGES.PREVIEW ? (
              <>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white"
                  style={{ background: "var(--am)" }}
                >
                  Confirm import
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-[7px] border px-3.5 py-2.5 text-xs"
                  style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                >
                  Choose different file
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-[7px] border py-2.5 text-xs"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {tab === TABS.LINK && (
        <>
          {sheetLink?.url && !editingLink ? (
            <div
              className="mb-4 rounded-[10px] border p-3.5"
              style={{ borderColor: "var(--ln)", background: "var(--up)" }}
            >
              <div className="mb-1 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>
                  <Link2 size={13} style={{ color: "var(--am)" }} />
                  Linked {sheetLink.type === "excel" ? "Excel file" : "Google Sheet"}
                </div>
                <span
                  className="rounded-full px-2 py-[2px] text-[9.5px] font-semibold uppercase tracking-[.04em]"
                  style={{ background: "var(--panel)", color: "var(--ink3)" }}
                >
                  {sheetLink.type === "excel" ? "Excel" : "Sheets"}
                </span>
              </div>
              <div
                className="mb-2 truncate rounded-[6px] px-2.5 py-1.5 text-[11px]"
                style={{ background: "var(--panel)", color: "var(--ink2)", fontFamily: "'JetBrains Mono', monospace" }}
                title={sheetLink.url}
              >
                {sheetLink.url}
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                Last synced {timeAgo(sheetLink.lastSyncedAt)}
              </div>
            </div>
          ) : isAdmin ? (
            <div className="mb-4">
              <div className="mb-3 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setLinkType("excel")}
                  className="flex-1 rounded-[7px] border px-3 py-2 text-xs font-medium transition-colors"
                  style={
                    linkType === "excel"
                      ? { borderColor: "var(--am)", background: "rgba(30,111,224,.08)", color: "var(--am)" }
                      : { borderColor: "var(--ln)", color: "var(--ink2)" }
                  }
                >
                  Excel (SharePoint/OneDrive)
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType("google_sheet")}
                  className="flex-1 rounded-[7px] border px-3 py-2 text-xs font-medium transition-colors"
                  style={
                    linkType === "google_sheet"
                      ? { borderColor: "var(--am)", background: "rgba(30,111,224,.08)", color: "var(--am)" }
                      : { borderColor: "var(--ln)", color: "var(--ink2)" }
                  }
                >
                  Google Sheet
                </button>
              </div>

              <label
                className="mb-1.5 block text-xs font-medium"
                style={{ color: "var(--ink2)" }}
              >
                {editingLink ? "New URL" : "URL"}
              </label>
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder={
                  linkType === "excel"
                    ? "https://yourcompany-my.sharepoint.com/...?download=1"
                    : "https://docs.google.com/spreadsheets/d/..."
                }
                className="w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
                style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
                autoFocus={editingLink}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--ink3)" }}>
                {linkType === "excel"
                  ? 'Share the file as "Anyone with the link can view," then use the direct-download version of that link (ending in ?download=1) — not the normal share link. This becomes the one file the whole team syncs from.'
                  : editingLink
                  ? "Paste the URL of the sheet you want to connect instead. Syncing will match/add/update against this new sheet."
                  : 'Set sharing to "Anyone with the link can view". We\'ll read every tab in the sheet. A direct published CSV link (single tab only) also works. This becomes the one sheet the whole team syncs from.'}
              </p>
            </div>
          ) : (
            <div
              className="mb-4 rounded-[10px] border p-3.5 text-xs leading-relaxed"
              style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
            >
              No master sheet connected yet. Ask an admin to connect one — once they do, you'll see it here automatically.
            </div>
          )}

          <label
            className="mb-4 flex items-start gap-2 rounded-[10px] border p-3"
            style={{
              borderColor: "var(--ln)",
              background: "var(--up)",
              cursor: isAdmin ? "pointer" : "default",
              opacity: isAdmin ? 1 : 0.7,
            }}
          >
            <input
              type="checkbox"
              checked={mirrorMode}
              disabled={!isAdmin}
              onChange={(e) => {
                const next = e.target.checked;
                setMirrorMode(next);
                // Persist right away (not just on next sync) so the
                // background auto-sync always uses the latest preference.
                if (sheetLink?.url) {
                  setSheetMirror(next);
                }
              }}
              className="mt-[2px] h-3.5 w-3.5 accent-[#1E6FE0]"
              style={{ cursor: isAdmin ? "pointer" : "not-allowed" }}
            />
            <span className="text-[11px] leading-relaxed" style={{ color: "var(--ink2)" }}>
              <b style={{ color: "var(--ink)" }}>Mirror this sheet exactly</b> — also remove any
              creator here that's no longer a row in the sheet. Turn this on once you're treating
              the Google Sheet as the single source of truth (deleting a row there deletes the
              creator here on next sync). Leave off to only ever add/update, never delete.
            </span>
          </label>

          {linkError && (
            <div
              className="mb-4 flex items-start gap-2 rounded-[10px] border p-3 text-xs"
              style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}
            >
              <AlertCircle size={14} className="mt-[1px] flex-shrink-0" />
              {linkError}
            </div>
          )}

          {syncSummary && !linkError && (
            <div
              className="mb-4 flex items-center gap-2 rounded-[10px] border p-3 text-xs font-medium"
              style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}
            >
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {syncSummary.added} added, {syncSummary.updated} updated
              {mirrorMode && `, ${syncSummary.removed} removed`}
              {syncSummary.rowErrors?.length > 0 &&
                `, ${syncSummary.rowErrors.length} row${syncSummary.rowErrors.length === 1 ? "" : "s"} skipped`}
            </div>
          )}

          {syncSummary?.rowErrors?.length > 0 && !linkError && (
            <div
              className="mb-4 rounded-[10px] border p-3.5"
              style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)" }}
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#E0524B" }}>
                <AlertCircle size={15} />
                {syncSummary.rowErrors.length} row{syncSummary.rowErrors.length === 1 ? "" : "s"} skipped due to errors
              </div>
              <div className="flex max-h-[200px] flex-col gap-1.5 overflow-auto">
                {syncSummary.rowErrors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-[7px] border px-2.5 py-2 text-xs"
                    style={{ borderColor: "rgba(224,82,75,.2)", background: "rgba(224,82,75,.04)", color: "#E0524B" }}
                  >
                    {err.rowNum ? (
                      <span className="font-semibold">Row {err.rowNum} {err.name ? `(${err.name})` : ""}: </span>
                    ) : null}
                    {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {sheetLink?.url && !editingLink ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--am)" }}
                >
                  <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartChangeLink}
                      className="flex items-center gap-1.5 rounded-[7px] border px-3.5 py-2.5 text-xs"
                      style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                    >
                      <Link2 size={13} />
                      Change link
                    </button>
                    <button
                      type="button"
                      onClick={handleUnlink}
                      className="flex items-center gap-1.5 rounded-[7px] border px-3.5 py-2.5 text-xs"
                      style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                    >
                      <Unlink size={13} />
                      Unlink
                    </button>
                  </>
                )}
              </>
            ) : isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={syncing || !linkInput.trim()}
                  className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--am)" }}
                >
                  {syncing ? "Connecting…" : "Connect & sync"}
                </button>
                <button
                  type="button"
                  onClick={editingLink ? handleCancelChangeLink : handleClose}
                  className="rounded-[7px] border px-3.5 py-2.5 text-xs"
                  style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-[7px] border py-2.5 text-xs"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
              >
                Close
              </button>
            )}
          </div>
        </>
      )}

      {tab === TABS.IMPORT && (
        <>
          <div
            className="mb-4 rounded-[10px] border p-3.5 text-[11px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
          >
            This adds creators from a different sheet into the same master list, once. It never
            changes which sheet the team keeps syncing from — that stays whatever's set on the
            Master sheet tab.
          </div>

          <div className="mb-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => setImportLinkType("excel")}
              className="flex-1 rounded-[7px] border px-3 py-2 text-xs font-medium transition-colors"
              style={
                importLinkType === "excel"
                  ? { borderColor: "var(--am)", background: "rgba(30,111,224,.08)", color: "var(--am)" }
                  : { borderColor: "var(--ln)", color: "var(--ink2)" }
              }
            >
              Excel (SharePoint/OneDrive)
            </button>
            <button
              type="button"
              onClick={() => setImportLinkType("google_sheet")}
              className="flex-1 rounded-[7px] border px-3 py-2 text-xs font-medium transition-colors"
              style={
                importLinkType === "google_sheet"
                  ? { borderColor: "var(--am)", background: "rgba(30,111,224,.08)", color: "var(--am)" }
                  : { borderColor: "var(--ln)", color: "var(--ink2)" }
              }
            >
              Google Sheet
            </button>
          </div>

          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--ink2)" }}
          >
            URL to import from
          </label>
          <input
            type="text"
            value={importLinkInput}
            onChange={(e) => setImportLinkInput(e.target.value)}
            placeholder={
              importLinkType === "excel"
                ? "https://yourcompany-my.sharepoint.com/...?download=1"
                : "https://docs.google.com/spreadsheets/d/..."
            }
            className="mb-4 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
            style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
          />

          {importRunError && (
            <div
              className="mb-4 flex items-start gap-2 rounded-[10px] border p-3 text-xs"
              style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}
            >
              <AlertCircle size={14} className="mt-[1px] flex-shrink-0" />
              {importRunError}
            </div>
          )}

          {importSummary && !importRunError && (
            <div
              className="mb-4 flex items-center gap-2 rounded-[10px] border p-3 text-xs font-medium"
              style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}
            >
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {importSummary.added} added, {importSummary.updated} updated
              {importSummary.rowErrors?.length > 0 &&
                `, ${importSummary.rowErrors.length} row${importSummary.rowErrors.length === 1 ? "" : "s"} skipped`}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImportFromSheet}
              disabled={importing || !importLinkInput.trim()}
              className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--am)" }}
            >
              {importing ? "Importing…" : "Import into master list"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[7px] border px-3.5 py-2.5 text-xs"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}