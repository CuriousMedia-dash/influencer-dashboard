import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import Modal from "../ui/Modal";
import { parseCsvImport, syncCreators } from "../../utils/csvImport";
import { useCreators } from "../../hooks/useCreators";
import { useToast } from "../../hooks/useToast";

const STAGES = { IDLE: "idle", ERRORS: "errors", PREVIEW: "preview" };
const TABS = { UPLOAD: "upload", LINK: "link", IMPORT: "import" };

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 text-xs font-medium transition-colors"
      style={
        active
          ? { background: "var(--panel)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(16,36,62,.08)" }
          : { color: "var(--ink3)" }
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
    confirmLocalImport,
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

  // ── Upload tab state ──
  const [stage, setStage] = useState(STAGES.IDLE);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);
  const [mirror, setMirror] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ── Master sheet (Link) tab state ──
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [syncSummary, setSyncSummary] = useState(null);
  const [mirrorMode, setMirrorMode] = useState(() => Boolean(sheetLink?.mirror));
  const [editingLink, setEditingLink] = useState(false);
  const syncing = syncStatus === "syncing";

  // ── Add more (Import) tab state ──
  const [importLinkInput, setImportLinkInput] = useState("");
  const [importRunError, setImportRunError] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);

  function handleClose() {
    setStage(STAGES.IDLE);
    setFileName("");
    setErrors([]);
    setPreview(null);
    setMirror(false);
    if (fileRef.current) fileRef.current.value = "";
    setLinkError("");
    setSyncSummary(null);
    setEditingLink(false);
    onClose();
  }

  // ── Upload handlers ──
  function buildPreview(rows, useMirror) {
    const { merged, added, updated, removed } = syncCreators(creators, rows, { mirror: useMirror });
    const mergedIds = new Set(merged.map((c) => c.id));
    const removedIds = creators.filter((c) => !mergedIds.has(c.id)).map((c) => c.id);
    setPreview({ merged, added, updated, removed, removedIds });
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
      text = await file.text();
    } catch (err) {
      setErrors([{ message: `Couldn't read that file: ${err.message || "unknown error"}` }]);
      setStage(STAGES.ERRORS);
      return;
    }

    const { rows, errors: parseErrors } = parseCsvImport(text);
    setErrors(parseErrors);

    if (rows.length === 0) {
      setStage(STAGES.ERRORS);
      return;
    }

    buildPreview(rows, mirror);
    setStage(STAGES.PREVIEW);
  }

  function handleMirrorToggle(next) {
    setMirror(next);
    if (stage === STAGES.PREVIEW && fileRef.current?.files?.[0]) {
      handleFileChange({ target: fileRef.current });
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setConfirming(true);
    try {
      await confirmLocalImport(preview.merged, { removedIds: preview.removedIds });
      const removedNote = preview.removedIds.length > 0 ? `, ${preview.removedIds.length} removed` : "";
      const errorNote = errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} skipped` : "";
      showToast(`${preview.added} added, ${preview.updated} updated${removedNote}${errorNote}`, true);
      handleClose();
    } catch (err) {
      setErrors([{ message: `Couldn't save: ${err.message || "unknown error"}` }]);
    } finally {
      setConfirming(false);
    }
  }

  // ── Master sheet handlers ──
  async function runSync(rawUrl) {
    setLinkError("");
    setSyncSummary(null);
    try {
      const { added, updated, removed, rowErrors } = await syncNow(rawUrl, { mirror: mirrorMode });
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
    runSync(linkInput.trim());
  }

  function handleSyncNow() {
    if (!sheetLink?.url) return;
    runSync(sheetLink.url);
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

  // ── Add more handlers ──
  async function handleImportFromSheet() {
    if (!importLinkInput.trim()) return;
    setImporting(true);
    setImportRunError("");
    setImportSummary(null);
    try {
      const { added, updated, rowErrors } = await importFromSheet(importLinkInput.trim());
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
          ? "Export your Google Sheet as a CSV file (File → Download → CSV) then upload it here. Rows are matched by name + phone + platform."
          : tab === TABS.LINK
          ? "This is the one master sheet the whole team syncs from — everyone sees the same data. Rows are matched by name + phone + platform."
          : "Pull creators in from a different sheet, one time. This adds to the master list above without changing which sheet it stays linked to."
      }
      maxWidth={520}
    >
      <div className="mb-4 flex gap-1 rounded-[10px] p-1" style={{ background: "var(--up)" }}>
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

      {/* ══════════════ UPLOAD TAB ══════════════ */}
      {tab === TABS.UPLOAD && (
        <>
          <div
            className="mb-4 flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-5 py-7 text-center"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(30,111,224,.10)" }}>
              <Upload size={20} style={{ color: "var(--am)" }} />
            </div>
            <div className="text-sm" style={{ color: "var(--ink2)" }}>
              {fileName ? (
                <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--ink)" }}>
                  <FileText size={14} />
                  {fileName}
                </span>
              ) : (
                <>Drag & drop your CSV here, or</>
              )}
            </div>
            <label
              className="cursor-pointer rounded-[7px] border px-3.5 py-[7px] text-xs font-medium transition-colors"
              style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
            >
              {fileName ? "Choose a different file" : "Choose file"}
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
            </label>
            <p className="text-[11px]" style={{ color: "var(--ink3)" }}>CSV exported from Google Sheets</p>
          </div>

          {isAdmin && (
            <label
              className="mb-4 flex cursor-pointer items-start gap-2 rounded-[10px] border p-3"
              style={{ borderColor: "var(--ln)", background: "var(--up)" }}
            >
              <input
                type="checkbox"
                checked={mirror}
                onChange={(e) => handleMirrorToggle(e.target.checked)}
                className="mt-[2px] h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
              />
              <span className="text-xs leading-relaxed" style={{ color: "var(--ink2)" }}>
                <span className="font-semibold" style={{ color: "var(--ink)" }}>Mirror this file exactly</span> — also
                remove any creator not in this file. Leave off to only ever add/update, never delete.
              </span>
            </label>
          )}

          {errors.length > 0 && (
            <div className="mb-4 rounded-[10px] border p-3.5" style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)" }}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#E0524B" }}>
                <AlertCircle size={15} />
                {stage === STAGES.PREVIEW ? `${errors.length} row${errors.length === 1 ? "" : "s"} skipped due to errors` : "Fix these errors before importing"}
              </div>
              <div className="flex max-h-[200px] flex-col gap-1.5 overflow-auto">
                {errors.map((err, i) => (
                  <div key={i} className="rounded-[7px] border px-2.5 py-2 text-xs" style={{ borderColor: "rgba(224,82,75,.2)", background: "rgba(224,82,75,.04)", color: "#E0524B" }}>
                    {err.rowNum ? <span className="font-semibold">Row {err.rowNum} {err.name ? `(${err.name})` : ""}: </span> : null}
                    {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === STAGES.PREVIEW && preview && (
            <div className="mb-4 rounded-[10px] border p-3.5" style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)" }}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#2BAE66" }}>
                <CheckCircle2 size={15} />
                Ready to import
              </div>
              <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink2)" }}>
                <div><span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>{preview.added}</span> new creator{preview.added === 1 ? "" : "s"} will be added</div>
                <div><span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>{preview.updated}</span> existing creator{preview.updated === 1 ? "" : "s"} will be updated</div>
                {mirror && preview.removedIds.length > 0 && (
                  <div style={{ color: "#E0524B" }}>
                    <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{preview.removedIds.length}</span> creator{preview.removedIds.length === 1 ? "" : "s"} not in this file will be removed
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {stage === STAGES.PREVIEW ? (
              <>
                <button type="button" onClick={handleConfirmImport} disabled={confirming} className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--am)" }}>
                  {confirming ? "Saving\u2026" : "Confirm import"}
                </button>
                <button type="button" onClick={() => { setStage(STAGES.IDLE); setPreview(null); setFileName(""); setErrors([]); if (fileRef.current) fileRef.current.value = ""; }} disabled={confirming} className="rounded-[7px] border px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                  Choose different file
                </button>
              </>
            ) : (
              <button type="button" onClick={handleClose} className="flex-1 rounded-[7px] border py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {/* ══════════════ MASTER SHEET TAB ══════════════ */}
      {tab === TABS.LINK && (
        <>
          {sheetLink?.url && !editingLink ? (
            <div className="mb-4 rounded-[10px] border p-3.5" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>
                <Link2 size={13} style={{ color: "var(--am)" }} />
                Linked sheet
              </div>
              <div className="mb-2 truncate rounded-[6px] px-2.5 py-1.5 text-[11px]" style={{ background: "var(--panel)", color: "var(--ink2)", fontFamily: "'JetBrains Mono', monospace" }} title={sheetLink.url}>
                {sheetLink.url}
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                {sheetLink.lastSyncedAt ? `Last synced ${new Date(sheetLink.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
              </div>
            </div>
          ) : isAdmin ? (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
                {editingLink ? "New Google Sheet URL" : "Google Sheet URL"}
              </label>
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
                style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
                autoFocus={editingLink}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--ink3)" }}>
                {editingLink
                  ? "Paste the URL of the sheet you want to connect instead. Syncing will match/add/update against this new sheet."
                  : 'Set sharing to "Anyone with the link can view". We\'ll read every tab in the sheet. This becomes the one sheet the whole team syncs from.'}
              </p>
            </div>
          ) : (
            <div className="mb-4 rounded-[10px] border p-3.5 text-xs leading-relaxed" style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}>
              No master sheet connected yet. Ask an admin to connect one — once they do, you'll see it here automatically.
            </div>
          )}

          {(sheetLink?.url || isAdmin) && (
            <label
              className="mb-4 flex items-start gap-2 rounded-[10px] border p-3"
              style={{ borderColor: "var(--ln)", background: "var(--up)", cursor: isAdmin ? "pointer" : "default", opacity: isAdmin ? 1 : 0.7 }}
            >
              <input
                type="checkbox"
                checked={mirrorMode}
                disabled={!isAdmin}
                onChange={(e) => {
                  const next = e.target.checked;
                  setMirrorMode(next);
                  if (sheetLink?.url) setSheetMirror(next);
                }}
                className="mt-[2px] h-3.5 w-3.5 accent-[#1E6FE0]"
                style={{ cursor: isAdmin ? "pointer" : "not-allowed" }}
              />
              <span className="text-xs leading-relaxed" style={{ color: "var(--ink2)" }}>
                <span className="font-semibold" style={{ color: "var(--ink)" }}>Mirror this sheet exactly</span> — also
                remove any creator here that's no longer a row in the sheet. Turn this on once you're treating the
                Google Sheet as the single source of truth. Leave off to only ever add/update, never delete.
              </span>
            </label>
          )}

          {linkError && (
            <div className="mb-4 flex items-start gap-2 rounded-[10px] border p-3 text-xs" style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}>
              <AlertCircle size={14} className="mt-[1px] flex-shrink-0" />
              {linkError}
            </div>
          )}

          {syncSummary && !linkError && (
            <div className="mb-4 flex items-center gap-2 rounded-[10px] border p-3 text-xs font-medium" style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}>
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {syncSummary.added} added, {syncSummary.updated} updated
              {mirrorMode && `, ${syncSummary.removed} removed`}
              {syncSummary.rowErrors?.length > 0 && `, ${syncSummary.rowErrors.length} row${syncSummary.rowErrors.length === 1 ? "" : "s"} skipped`}
            </div>
          )}

          <div className="flex gap-2">
            {sheetLink?.url && !editingLink ? (
              <>
                <button type="button" onClick={handleSyncNow} disabled={syncing} className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--am)" }}>
                  <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing\u2026" : "Sync now"}
                </button>
                {isAdmin && (
                  <>
                    <button type="button" onClick={handleStartChangeLink} className="flex items-center gap-1.5 rounded-[7px] border px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                      <Link2 size={13} />
                      Change link
                    </button>
                    <button type="button" onClick={handleUnlink} className="flex items-center gap-1.5 rounded-[7px] border px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                      <Unlink size={13} />
                      Unlink
                    </button>
                  </>
                )}
              </>
            ) : isAdmin ? (
              <>
                <button type="button" onClick={handleConnect} disabled={syncing || !linkInput.trim()} className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--am)" }}>
                  {syncing ? "Connecting\u2026" : "Connect & sync"}
                </button>
                <button type="button" onClick={editingLink ? handleCancelChangeLink : handleClose} className="rounded-[7px] border px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={handleClose} className="flex-1 rounded-[7px] border py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                Close
              </button>
            )}
          </div>
        </>
      )}

      {/* ══════════════ ADD MORE TAB (admin only) ══════════════ */}
      {tab === TABS.IMPORT && isAdmin && (
        <>
          <div className="mb-4 rounded-[10px] border p-3.5 text-[11px] leading-relaxed" style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}>
            This adds creators from a different sheet into the same master list, once. It never changes which sheet
            the team keeps syncing from — that stays whatever's set on the Master sheet tab.
          </div>

          <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
            Google Sheet URL to import from
          </label>
          <input
            type="text"
            value={importLinkInput}
            onChange={(e) => setImportLinkInput(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="mb-4 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
            style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
          />

          {importRunError && (
            <div className="mb-4 flex items-start gap-2 rounded-[10px] border p-3 text-xs" style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}>
              <AlertCircle size={14} className="mt-[1px] flex-shrink-0" />
              {importRunError}
            </div>
          )}

          {importSummary && !importRunError && (
            <div className="mb-4 flex items-center gap-2 rounded-[10px] border p-3 text-xs font-medium" style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}>
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {importSummary.added} added, {importSummary.updated} updated
              {importSummary.rowErrors?.length > 0 && `, ${importSummary.rowErrors.length} row${importSummary.rowErrors.length === 1 ? "" : "s"} skipped`}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleImportFromSheet} disabled={importing || !importLinkInput.trim()} className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--am)" }}>
              {importing ? "Importing\u2026" : "Import into master list"}
            </button>
            <button type="button" onClick={handleClose} className="rounded-[7px] border px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}