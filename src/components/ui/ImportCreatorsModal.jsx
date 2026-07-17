import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal";
import { parseCsvImport, syncCreators } from "../../utils/csvImport";
import { excelFileToCsv, isExcelFile } from "../../utils/xlsxImport";
import { useCreators } from "../../hooks/useCreators";
import { useToast } from "../../hooks/useToast";

const STAGES = {
  IDLE: "idle",         // waiting for file pick
  ERRORS: "errors",     // file has validation errors — show them
  PREVIEW: "preview",   // file is valid — show summary before confirming
};

// One single upload flow, for everyone — this is now the only way creator
// data gets into the app (no more URL-based sheet syncing, which turned
// out to be too fragile against Microsoft's link/auth behavior). Regular
// users can add/update; only admins additionally get the option to treat
// an upload as a full replacement (removing creators no longer present).
export default function ImportCreatorsModal({ open, onClose }) {
  const { creators, confirmLocalImport, isAdmin } = useCreators();
  const showToast = useToast();
  const fileRef = useRef(null);

  const [stage, setStage] = useState(STAGES.IDLE);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null); // { merged, added, updated, removed, removedIds }
  const [mirror, setMirror] = useState(false);  // admin-only "replace" mode
  const [confirming, setConfirming] = useState(false);

  function reset() {
    setStage(STAGES.IDLE);
    setFileName("");
    setErrors([]);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    setMirror(false);
    onClose();
  }

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
      text = isExcelFile(file) ? await excelFileToCsv(file) : await file.text();
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

  // If an admin toggles "Mirror this file" after already picking a file,
  // recompute the preview against the same parsed rows so the counts stay
  // accurate without needing to re-pick the file.
  function handleMirrorToggle(next) {
    setMirror(next);
    if (stage === STAGES.PREVIEW && fileRef.current?.files?.[0]) {
      // Re-run using the same file already in the input.
      handleFileChange({ target: fileRef.current });
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setConfirming(true);
    try {
      await confirmLocalImport(preview.merged, { removedIds: preview.removedIds });
      const removedNote = preview.removedIds.length > 0 ? `, ${preview.removedIds.length} removed` : "";
      const errorNote = errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} had errors and were skipped` : "";
      showToast(
        `${preview.added} added, ${preview.updated} updated${removedNote}${errorNote}`,
        true
      );
      reset();
      setMirror(false);
      onClose();
    } catch (err) {
      setErrors([{ message: `Couldn't save: ${err.message || "unknown error"}` }]);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Creators"
      description="Upload an Excel (.xlsx) or CSV file. Rows are matched by name + phone + platform — a match updates that creator, anything new gets added, and the same person on 2 platforms is kept as 2 entries."
      maxWidth={520}
    >
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
          .xlsx, .xls, or .csv
        </p>
      </div>

      {/* ── Admin-only "replace" mode ── */}
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
            <span className="font-semibold" style={{ color: "var(--ink)" }}>
              Mirror this file exactly
            </span>{" "}
            — also remove any creator not in this file. Turn this on when this upload is meant to be the new
            complete master list, not just an addition. Leave off to only ever add/update, never delete.
          </span>
        </label>
      )}

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
              new creator{preview.added === 1 ? "" : "s"} will be added
            </div>
            <div>
              <span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {preview.updated}
              </span>{" "}
              existing creator{preview.updated === 1 ? "" : "s"} will be updated
            </div>
            {mirror && preview.removedIds.length > 0 && (
              <div style={{ color: "#E0524B" }}>
                <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {preview.removedIds.length}
                </span>{" "}
                creator{preview.removedIds.length === 1 ? "" : "s"} not in this file will be removed
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Expected format hint ── */}
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
              disabled={confirming}
              className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--am)" }}
            >
              {confirming ? "Saving\u2026" : "Confirm import"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={confirming}
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
    </Modal>
  );
}
