import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import Modal from "../ui/Modal";
import { parseCsvImport, syncCreators } from "../../utils/csvImport";
import { useCreators } from "../../hooks/useCreators";
import { useToast } from "../../hooks/useToast";

const STAGES = { IDLE: "idle", ERRORS: "errors", PREVIEW: "preview" };
const TABS = { UPLOAD: "upload", LINK: "link" };

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
  const [confirming, setConfirming] = useState(false);

  // ── Master sheet (Link) tab state ──
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [syncSummary, setSyncSummary] = useState(null);
  const [mirrorMode, setMirrorMode] = useState(() => Boolean(sheetLink?.mirror));
  const [editingLink, setEditingLink] = useState(false);
  const syncing = syncStatus === "syncing";

  function handleClose() {
    setStage(STAGES.IDLE);
    setFileName("");
    setErrors([]);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setLinkError("");
    setSyncSummary(null);
    setEditingLink(false);
    onClose();
  }

  // ── Upload handlers ──
  // CSV uploads are always add/update only — never delete. Mirroring
  // (the ability to remove creators) is a Master Sheet-only concept now,
  // so ad-hoc CSV additions can never accidentally wipe anyone out.
  function buildPreview(rows) {
    const { merged, added, updated, addedKeys } = syncCreators(creators, rows, { mirror: false });
    setPreview({ merged, added, updated, addedKeys });
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

    buildPreview(rows);
    setStage(STAGES.PREVIEW);
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setConfirming(true);
    try {
      await confirmLocalImport(preview.merged, { addedKeys: preview.addedKeys });
      const errorNote = errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} skipped` : "";
      showToast(`${preview.added} added, ${preview.updated} updated${errorNote}`, true);
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Creators"
      description={
        tab === TABS.UPLOAD
          ? "Export your Google Sheet (or any spreadsheet) as a CSV file and upload it here to add new creators or update existing ones. Rows are matched by name + phone + platform — this can never delete anyone, only add or update."
          : "This is the one master sheet the whole team syncs from — everyone sees the same data. Rows are matched by name + phone + platform."
      }
      maxWidth={520}
    >
      <div className="mb-4 flex gap-1 rounded-[10px] p-1" style={{ background: "var(--up)" }}>
        <TabButton
          active={tab === TABS.LINK}
          onClick={() => setTab(TABS.LINK)}
          icon={<Link2 size={13} />}
          label="Master sheet"
        />
        <TabButton
          active={tab === TABS.UPLOAD}
          onClick={() => setTab(TABS.UPLOAD)}
          icon={<Upload size={13} />}
          label="Add creators (CSV)"
        />
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
            <div className="mb-4 flex items-start gap-2 whitespace-pre-line rounded-[10px] border p-3 text-xs" style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}>
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

    </Modal>
  );
}