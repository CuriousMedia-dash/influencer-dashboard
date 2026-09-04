import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal";
import { parseCsvImport } from "../../utils/csvImport";
import { useCreators } from "../../hooks/useCreators";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "../../hooks/useToast";

const STAGES = { IDLE: "idle", ERRORS: "errors", PREVIEW: "preview" };

/**
 * Uploads a CSV directly into one campaign. Two things happen at once:
 * every row lands in the main influencer database (new ones are created,
 * ones already there are left in place), and all of them are then linked
 * to this campaign. Matching uses the same rule as everywhere else — the
 * profile link — so re-uploading a list never creates a second copy of
 * anyone.
 */
export default function ImportCampaignCreatorsModal({ open, onClose, campaignId, campaignName }) {
  const { previewCsvImport, confirmLocalImport, fetchExistingByDedupeKeys } = useCreators();
  const { addCreatorsToCampaign } = useCampaigns();
  const showToast = useToast();
  const fileRef = useRef(null);

  const [stage, setStage] = useState(STAGES.IDLE);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setStage(STAGES.IDLE);
    setFileName("");
    setErrors([]);
    setPreview(null);
    setParsedRows([]);
    if (fileRef.current) fileRef.current.value = "";
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

    setParsedRows(rows);
    setPreviewing(true);
    try {
      const { merged, added, updated, addedKeys } = await previewCsvImport(rows);
      setPreview({ merged, added, existing: updated, addedKeys });
      setStage(STAGES.PREVIEW);
    } catch (err) {
      setErrors([{ message: `Couldn't check for duplicates: ${err.message || "unknown error"}` }]);
      setStage(STAGES.ERRORS);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setSaving(true);
    try {
      // 1. Save every row into the main database first (adds the new
      //    ones, refreshes the ones already there).
      await confirmLocalImport(preview.merged, { addedKeys: preview.addedKeys });

      // 2. Read back the real database ids — the rows just created got
      //    their ids from the database, not from the CSV.
      const idMap = await fetchExistingByDedupeKeys(parsedRows);
      const creatorIds = Array.from(idMap.values()).map((c) => c.id);

      // 3. Link them all to this campaign. Anyone already in it is
      //    skipped, so re-uploading doesn't duplicate a row here either.
      await addCreatorsToCampaign(campaignId, creatorIds);

      const errorNote = errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} skipped` : "";
      showToast(`${creatorIds.length} added to this campaign (${preview.added} new to the database)${errorNote}`, true);
      handleClose();
    } catch (err) {
      setErrors([{ message: `Couldn't save: ${err.message || "unknown error"}` }]);
      setStage(STAGES.ERRORS);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Upload CSV to this campaign"
      description={`Adds everyone in the file to ${campaignName || "this campaign"} and to the main influencer database. Rows are matched by profile link, so anyone already there is reused rather than duplicated.`}
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
            <>Drag &amp; drop your CSV here, or</>
          )}
        </div>
        <label
          className="cursor-pointer rounded-[7px] border px-3.5 py-[7px] text-xs font-medium transition-colors"
          style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
        >
          {fileName ? "Choose a different file" : "Choose file"}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
        </label>
        <p className="text-[11px]" style={{ color: "var(--ink3)" }}>
          Same columns as the main upload — Influencer Name and a profile link at minimum
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-[10px] border p-3.5" style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)" }}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#E0524B" }}>
            <AlertCircle size={15} />
            {stage === STAGES.PREVIEW
              ? `${errors.length} row${errors.length === 1 ? "" : "s"} skipped due to errors`
              : "Fix these errors before uploading"}
          </div>
          <div className="flex max-h-[180px] flex-col gap-1.5 overflow-auto">
            {errors.map((err, i) => (
              <div
                key={i}
                className="rounded-[7px] border px-2.5 py-2 text-xs"
                style={{ borderColor: "rgba(224,82,75,.2)", background: "rgba(224,82,75,.04)", color: "#E0524B" }}
              >
                {err.rowNum ? (
                  <span className="font-semibold">
                    Row {err.rowNum} {err.name ? `(${err.name})` : ""}:{" "}
                  </span>
                ) : null}
                {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {previewing && (
        <div
          className="mb-4 rounded-[10px] border p-3.5 text-xs"
          style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
        >
          {"Checking which of these are already in the database\u2026"}
        </div>
      )}

      {stage === STAGES.PREVIEW && preview && (
        <div className="mb-4 rounded-[10px] border p-3.5" style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)" }}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#2BAE66" }}>
            <CheckCircle2 size={15} />
            Ready to upload
          </div>
          <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink2)" }}>
            <div>
              <span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {preview.added + preview.existing}
              </span>{" "}
              will be added to this campaign
            </div>
            <div>
              <span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {preview.added}
              </span>{" "}
              of them are new to the database
            </div>
            <div>
              <span className="font-semibold" style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {preview.existing}
              </span>{" "}
              already exist and will be reused, not duplicated
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {stage === STAGES.PREVIEW ? (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--am)" }}
            >
              {saving ? "Adding\u2026" : "Add to campaign"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage(STAGES.IDLE);
                setPreview(null);
                setFileName("");
                setErrors([]);
                if (fileRef.current) fileRef.current.value = "";
              }}
              disabled={saving}
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
