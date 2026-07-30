import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import Modal from "../ui/Modal";
import { parseAcquisitionCsv } from "../../utils/acquisitionCsvImport";
import { fetchSheetCsv, normaliseSheetUrl } from "../../utils/sheetSync";
import { getSavedAcquisitionSheetLink, saveAcquisitionSheetLink, clearAcquisitionSheetLink } from "../../utils/acquisitionSheetLink";
import { useAcquisitionCreators } from "../../hooks/useAcquisitionCreators";
import { useToast } from "../../hooks/useToast";
import { timeAgo } from "../../utils/format";

const TABS = { CSV: "csv", SHEET: "sheet" };

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

// Creator Acquisition's own upload modal — mastersheet (linked Google
// Sheet) + CSV, mirroring the same two properties, per spec. Both
// dedupe/add-or-update via bulkImportCreators; neither ever deletes rows.
export default function ImportAcquisitionCreatorsModal({ open, onClose }) {
  const { bulkImportCreators } = useAcquisitionCreators();
  const showToast = useToast();
  const fileRef = useRef(null);

  const [tab, setTab] = useState(TABS.CSV);

  // ── CSV tab state ──
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [rows, setRows] = useState(null);
  const [importing, setImporting] = useState(false);

  // ── Master sheet tab state ──
  const [sheetLink, setSheetLink] = useState(() => getSavedAcquisitionSheetLink());
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [editingLink, setEditingLink] = useState(!sheetLink);

  function handleClose() {
    setFileName("");
    setErrors([]);
    setRows(null);
    if (fileRef.current) fileRef.current.value = "";
    setLinkError("");
    onClose();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setRows(null);

    let text;
    try {
      text = await file.text();
    } catch (err) {
      setErrors([{ message: `Couldn't read that file: ${err.message || "unknown error"}` }]);
      return;
    }

    const { rows: parsedRows, errors: parseErrors } = parseAcquisitionCsv(text);
    if (parsedRows.length === 0) {
      setErrors(parseErrors.length ? parseErrors : [{ message: "No usable rows found." }]);
      return;
    }
    setRows(parsedRows);
    setErrors(parseErrors);
  }

  async function handleConfirmCsvImport() {
    if (!rows) return;
    setImporting(true);
    try {
      const { added, updated } = await bulkImportCreators(rows);
      showToast(`Imported: ${added} added, ${updated} updated.`, true);
      handleClose();
    } catch (err) {
      showToast(`Import failed: ${err.message || "unknown error"}`, false);
    } finally {
      setImporting(false);
    }
  }

  async function handleSyncSheet(urlOverride) {
    const rawUrl = urlOverride ?? sheetLink?.url ?? linkInput;
    if (!rawUrl) return;
    setLinkError("");
    setSyncing(true);
    try {
      const csvUrl = normaliseSheetUrl(rawUrl);
      const text = await fetchSheetCsv(csvUrl);
      const { rows: parsedRows, errors: parseErrors } = parseAcquisitionCsv(text);
      if (parsedRows.length === 0) {
        throw new Error(parseErrors[0]?.message || "No usable rows found in that sheet.");
      }
      const { added, updated } = await bulkImportCreators(parsedRows);
      const link = { url: rawUrl, lastSyncedAt: new Date().toISOString() };
      saveAcquisitionSheetLink(link);
      setSheetLink(link);
      setEditingLink(false);
      showToast(`Synced: ${added} added, ${updated} updated.`, true);
    } catch (err) {
      setLinkError(err.message || "Couldn't sync that sheet.");
    } finally {
      setSyncing(false);
    }
  }

  function handleUnlink() {
    clearAcquisitionSheetLink();
    setSheetLink(null);
    setLinkInput("");
    setEditingLink(true);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Creators" maxWidth={560}>
      <div className="flex flex-col gap-3 p-1">
        <div className="flex gap-1 rounded-[9px] border p-1" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
          <TabButton active={tab === TABS.CSV} onClick={() => setTab(TABS.CSV)} icon={<Upload size={13} />} label="CSV" />
          <TabButton active={tab === TABS.SHEET} onClick={() => setTab(TABS.SHEET)} icon={<Link2 size={13} />} label="Master Sheet" />
        </div>

        {tab === TABS.CSV && (
          <div className="flex flex-col gap-3">
            <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
              Adds new creators and updates existing ones (matched by email, or by name + link). Never deletes anything.
            </div>

            <label
              className="flex cursor-pointer flex-col items-center gap-2 rounded-[10px] border border-dashed px-4 py-6 text-center"
              style={{ borderColor: "var(--ln)" }}
            >
              <FileText size={20} style={{ color: "var(--ink3)" }} />
              <span className="text-[12px]" style={{ color: "var(--ink2)" }}>
                {fileName || "Click to choose a .csv file"}
              </span>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>

            {errors.length > 0 && (
              <div className="flex flex-col gap-1 rounded-[8px] border px-3 py-2 text-[11px]" style={{ borderColor: "#E0524B44", background: "#E0524B11", color: "#E0524B" }}>
                {errors.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {e.message}
                  </div>
                ))}
                {errors.length > 5 && <div>+{errors.length - 5} more</div>}
              </div>
            )}

            {rows && (
              <div className="flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px]" style={{ borderColor: "#2BAE6644", background: "#2BAE6611", color: "#2BAE66" }}>
                <CheckCircle2 size={13} />
                {rows.length} row{rows.length === 1 ? "" : "s"} ready to import.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="rounded-[8px] border px-3 py-2 text-[13px]" style={{ borderColor: "var(--ln)" }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCsvImport}
                disabled={!rows || importing}
                className="rounded-[8px] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                style={{ background: "var(--am)" }}
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        )}

        {tab === TABS.SHEET && (
          <div className="flex flex-col gap-3">
            <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
              {sheetLink?.url && !editingLink
                ? "This is the linked master sheet the whole team syncs from — same columns as the CSV. Rows are matched by email, or by name + link."
                : "Paste a Google Sheets share link (shared as \"Anyone with the link can view\"), or a direct CSV URL."}
            </div>

            {sheetLink?.url && !editingLink ? (
              <div className="flex flex-col gap-2 rounded-[9px] border p-3" style={{ borderColor: "var(--ln)" }}>
                <div className="truncate text-[12px]" title={sheetLink.url} style={{ color: "var(--ink)" }}>
                  {sheetLink.url}
                </div>
                {sheetLink.lastSyncedAt && (
                  <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                    Last synced {timeAgo(sheetLink.lastSyncedAt)}
                  </div>
                )}
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSyncSheet()}
                    disabled={syncing}
                    className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-60"
                    style={{ background: "var(--am)" }}
                  >
                    <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLink(true)}
                    className="rounded-[8px] border px-3 py-2 text-[12px]"
                    style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                  >
                    Change link
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px]"
                    style={{ borderColor: "var(--ln)", color: "#E0524B" }}
                  >
                    <Unlink size={12} />
                    Unlink
                  </button>
                </div>
                {linkError && <div className="text-[11px]" style={{ color: "#E0524B" }}>{linkError}</div>}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
                  style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
                />
                {linkError && <div className="text-[11px]" style={{ color: "#E0524B" }}>{linkError}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={handleClose} className="rounded-[8px] border px-3 py-2 text-[13px]" style={{ borderColor: "var(--ln)" }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncSheet(linkInput)}
                    disabled={!linkInput || syncing}
                    className="rounded-[8px] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--am)" }}
                  >
                    {syncing ? "Linking…" : "Link & Sync"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
