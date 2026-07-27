import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal";
import { parseCsvImport, syncCreators } from "../../utils/csvImport";
import { useCreators } from "../../hooks/useCreators";
import { useToast } from "../../hooks/useToast";

const STAGES = { IDLE: "idle", ERRORS: "errors", PREVIEW: "preview" };

export default function ImportCreatorsModal({ open, onClose }) {
  const { creators, confirmLocalImport } = useCreators();
  const showToast = useToast();
  const fileRef = useRef(null);

  const [stage, setStage] = useState(STAGES.IDLE);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);

  function handleClose() {
    setStage(STAGES.IDLE);
    setFileName("");
    setErrors([]);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  // CSV uploads are always add/update only — never delete. This keeps a
  // stray or partial CSV from ever accidentally wiping anyone out; to
  // remove creators, use the delete action in the creators table instead.
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Upload Creators"
      description="Export your Google Sheet (or any spreadsheet) as a CSV file and upload it here to add new creators or update existing ones. Rows are matched by their platform link — this can never delete anyone, only add or update."
      maxWidth={520}
    >
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
    </Modal>
  );
}
