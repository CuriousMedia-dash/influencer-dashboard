import { useRef, useState } from "react";
import { ArrowUpDown, Trash2, Lock, Paperclip, FileText, Loader2 } from "lucide-react";
import EditableCell from "../ui/EditableCell";
import { fmt, isUrl } from "../../utils/format";
import {
  ACQ_LEAD_QUALITY,
  ACQ_LEAD_QUALITY_LABELS,
  ACQ_LEAD_QUALITY_COLORS,
  MB_STATUS_OPTIONS,
  MB_STATUS_LABELS,
} from "../../utils/acquisitionConstants";
import { nameFromEmail, isClaimed, isOwner, isLocked } from "../../utils/acquisitionOwnership";
import { uploadAcquisitionAttachment } from "../../utils/acquisitionAttachments";
import { useToast } from "../../hooks/useToast";

const th = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[.06em] whitespace-nowrap";
const td = "px-3 py-2 text-[12px] align-middle";

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1"
      style={{ color: active ? "var(--am)" : "inherit" }}
    >
      {label}
      <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.4 }} />
    </button>
  );
}

function Select({ value, options, labels, onChange, colorMap, disabled }) {
  const color = colorMap?.[value];
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-[6px] border bg-transparent px-1.5 py-1 text-[11px] disabled:opacity-40"
      style={{ borderColor: "var(--ln)", color: color || "var(--ink)" }}
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels ? labels[opt] : opt}
        </option>
      ))}
    </select>
  );
}

function YesNoToggle({ value, onChange, disabled, disabledTitle }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className="rounded-full border px-2 py-[3px] text-[11px] font-medium disabled:opacity-40"
      style={{
        borderColor: value ? "#2BAE66" : "var(--ln)",
        background: value ? "rgba(43,174,102,.1)" : "transparent",
        color: value ? "#2BAE66" : "var(--ink3)",
      }}
    >
      {value ? "Yes" : "No"}
    </button>
  );
}

function Blank() {
  return <span style={{ color: "var(--ink3)" }}>—</span>;
}

// Small "attach a file" control — shows a paperclip to upload when
// nothing's attached yet, or a filename link + re-upload option once
// something is. Used for both the Convert-PDF and Marketing-Report-CSV
// attachments.
function AttachButton({ kind, recordId, field, accept, fileUrl, fileName, onAttached, label }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const showToast = useToast();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url, name } = await uploadAcquisitionAttachment(kind, recordId, field, file);
      onAttached(url, name);
    } catch (err) {
      showToast(err.message || `Couldn't upload ${label}.`, false);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 truncate text-[11px]"
          style={{ color: "var(--am)", maxWidth: 90 }}
          title={fileName}
        >
          <FileText size={11} />
          <span className="truncate">{fileName || "File"}</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[11px] font-medium"
          style={{ color: "var(--am)" }}
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
          Add {label}
        </button>
      )}
      {fileUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title={`Replace ${label}`}
          disabled={uploading}
          style={{ color: "var(--ink3)" }}
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function AcquisitionCreatorsTable({
  rows,
  sort,
  onSort,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onUpdate,
  onDelete,
  currentUserEmail,
  countLabel = "Subscribers",
  categories = [],
  categoryColors = {},
  handoverLabel = "Handover to SMM",
  hasMarketingBudget = true,
  resourceKind = "creators",
  onNearBottom,
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  // Claiming: writing Remark 1 on an unclaimed (or expired) row assigns
  // it to the current user.
  function handleRemark1Change(row, value) {
    if (!isClaimed(row) || isOwner(row, currentUserEmail)) {
      const claimFields = { remark1: value };
      if (!isClaimed(row)) {
        claimFields.stakeholder = nameFromEmail(currentUserEmail);
        claimFields.stakeholderEmail = currentUserEmail;
        claimFields.claimedAt = new Date().toISOString();
      }
      onUpdate(row.id, claimFields);
    }
  }

  // Convert -> Yes auto-sets Status to "Onboarded"; blocked entirely
  // unless a PDF is already attached.
  function handleConvertChange(row, value) {
    if (value && !row.convertPdfUrl) return; // guarded by the disabled toggle too
    const fields = { convert: value };
    if (value) fields.status = "Onboarded";
    onUpdate(row.id, fields);
  }

  const colCount = 18 + (hasMarketingBudget ? 4 : 0);

  function handleScroll(e) {
    if (!onNearBottom) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 150) onNearBottom();
  }

  return (
    <div
      className="overflow-x-auto overflow-y-auto rounded-[12px] border"
      style={{ borderColor: "var(--ln)", background: "var(--panel)", maxHeight: 460 }}
      onScroll={handleScroll}
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10" style={{ background: "var(--panel)" }}>
          <tr className="border-b" style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}>
            <th className={th}>
              <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
            </th>
            <th className={th}>Name</th>
            <th className={th}><SortHeader label={countLabel} sortKey="subscribers" sort={sort} onSort={onSort} /></th>
            <th className={th}>Mail</th>
            <th className={th}>Number</th>
            <th className={th}>Category</th>
            <th className={th}>Stakeholder</th>
            <th className={th}>Remark 1</th>
            <th className={th}>Remark 2</th>
            <th className={th}>Remark 3</th>
            <th className={th}>Lead Quality</th>
            <th className={th}>Convert</th>
            {hasMarketingBudget && (
              <>
                <th className={th}>Marketing Budget</th>
                <th className={th}>MB1</th>
                <th className={th}>MB2</th>
                <th className={th}>MB3</th>
              </>
            )}
            <th className={th}><SortHeader label="Date of Joining" sortKey="dateOfJoining" sort={sort} onSort={onSort} /></th>
            <th className={th}><SortHeader label="Execution Date" sortKey="executionDate" sort={sort} onSort={onSort} /></th>
            <th className={th}>{handoverLabel}</th>
            <th className={th}>Marketing Report</th>
            <th className={th}>Status</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const locked = isLocked(r, currentUserEmail);
            return (
              <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "var(--ln)" }}>
                <td className={td}>
                  <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => onToggleSelected(r.id)} />
                </td>
                <td className={td}>
                  {r.profileLink && isUrl(r.profileLink) ? (
                    <a href={r.profileLink} target="_blank" rel="noreferrer" style={{ color: "var(--am)" }}>
                      {r.name || "Untitled"}
                    </a>
                  ) : (
                    <span>{r.name || "Untitled"}</span>
                  )}
                </td>
                <td className={td} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.subscribers)}</td>
                <td className={td}>
                  <EditableCell value={r.email} label="Mail" onSave={(v) => onUpdate(r.id, { email: v })} />
                </td>
                <td className={td}>
                  <EditableCell value={r.phone} label="Number" onSave={(v) => onUpdate(r.id, { phone: v })} />
                </td>
                <td className={td}>
                  <Select
                    value={r.category}
                    options={categories}
                    colorMap={categoryColors}
                    onChange={(v) => onUpdate(r.id, { category: v })}
                  />
                </td>
                <td className={td}>
                  {r.stakeholder ? (
                    <span className="flex items-center gap-1" title={r.stakeholderEmail}>
                      {locked && <Lock size={10} style={{ color: "var(--ink3)" }} />}
                      {r.stakeholder}
                    </span>
                  ) : (
                    <Blank />
                  )}
                </td>
                <td className={td}>
                  <EditableCell value={r.remark1} label="Remark 1" onSave={(v) => handleRemark1Change(r, v)} />
                </td>
                <td className={td}>
                  {locked ? <Blank /> : <EditableCell value={r.remark2} label="Remark 2" onSave={(v) => onUpdate(r.id, { remark2: v })} />}
                </td>
                <td className={td}>
                  {locked ? <Blank /> : <EditableCell value={r.remark3} label="Remark 3" onSave={(v) => onUpdate(r.id, { remark3: v })} />}
                </td>

                {/* Lead Quality: visible to everyone, but only the stakeholder can edit it once claimed. */}
                <td className={td}>
                  <Select
                    value={r.executionStage}
                    options={ACQ_LEAD_QUALITY}
                    labels={ACQ_LEAD_QUALITY_LABELS}
                    colorMap={ACQ_LEAD_QUALITY_COLORS}
                    disabled={locked}
                    onChange={(v) => onUpdate(r.id, { executionStage: v })}
                  />
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <YesNoToggle
                      value={r.convert}
                      onChange={(v) => handleConvertChange(r, v)}
                      disabled={!r.convert && !r.convertPdfUrl}
                      disabledTitle="Attach a PDF before marking this Yes"
                    />
                    <AttachButton
                      kind={resourceKind}
                      recordId={r.id}
                      field="convertPdf"
                      accept="application/pdf"
                      fileUrl={r.convertPdfUrl}
                      fileName={r.convertPdfName}
                      label="PDF"
                      onAttached={(url, name) => onUpdate(r.id, { convertPdfUrl: url, convertPdfName: name })}
                    />
                  </div>
                </td>

                {hasMarketingBudget && (
                  <>
                    <td className={td}>
                      {locked ? <Blank /> : <EditableCell value={r.marketingBudget ? String(r.marketingBudget) : ""} label="Marketing budget" onSave={(v) => onUpdate(r.id, { marketingBudget: v })} />}
                    </td>
                    {["mb1Status", "mb2Status", "mb3Status"].map((field) => (
                      <td className={td} key={field}>
                        {locked ? (
                          <Blank />
                        ) : (
                          <Select
                            value={r[field]}
                            options={MB_STATUS_OPTIONS}
                            labels={MB_STATUS_LABELS}
                            onChange={(v) => onUpdate(r.id, { [field]: v })}
                          />
                        )}
                      </td>
                    ))}
                  </>
                )}

                <td className={td}>
                  {locked ? (
                    <Blank />
                  ) : (
                    <input
                      type="date"
                      value={r.dateOfJoining || ""}
                      onChange={(e) => onUpdate(r.id, { dateOfJoining: e.target.value })}
                      className="rounded-[6px] border bg-transparent px-1.5 py-1 text-[11px]"
                      style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
                    />
                  )}
                </td>
                <td className={td}>
                  {locked ? (
                    <Blank />
                  ) : (
                    <input
                      type="date"
                      value={r.executionDate || ""}
                      onChange={(e) => onUpdate(r.id, { executionDate: e.target.value })}
                      className="rounded-[6px] border bg-transparent px-1.5 py-1 text-[11px]"
                      style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
                    />
                  )}
                </td>
                <td className={td}>
                  {locked ? <Blank /> : <YesNoToggle value={r.handoverToSmm} onChange={(v) => onUpdate(r.id, { handoverToSmm: v })} />}
                </td>
                <td className={td}>
                  {locked ? (
                    <Blank />
                  ) : (
                    <AttachButton
                      kind={resourceKind}
                      recordId={r.id}
                      field="marketingReportCsv"
                      accept=".csv"
                      fileUrl={r.marketingReportCsvUrl}
                      fileName={r.marketingReportCsvName}
                      label="CSV"
                      onAttached={(url, name) => onUpdate(r.id, { marketingReportCsvUrl: url, marketingReportCsvName: name })}
                    />
                  )}
                </td>

                {/* Status stays visible & editable to everyone. */}
                <td className={td}>
                  {r.convert ? (
                    <span style={{ color: "#2BAE66" }}>Onboarded</span>
                  ) : (
                    <EditableCell value={r.status} label="Status" variant="pill" onSave={(v) => onUpdate(r.id, { status: v })} />
                  )}
                </td>

                <td className={td}>
                  {!locked && (
                    <button type="button" onClick={() => onDelete(r.id)} title="Remove" style={{ color: "var(--ink3)" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={colCount} style={{ color: "var(--ink3)", textAlign: "center", padding: "24px" }}>
                No rows match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}