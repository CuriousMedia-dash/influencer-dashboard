import { ArrowUpDown, Trash2 } from "lucide-react";
import EditableCell from "../ui/EditableCell";
import { fmt, isUrl } from "../../utils/format";
import {
  ACQ_CATEGORIES,
  ACQ_CATEGORY_COLORS,
  ACQ_EXECUTION_STAGES,
  ACQ_EXECUTION_STAGE_LABELS,
  ACQ_EXECUTION_STAGE_COLORS,
  MB_STATUS_OPTIONS,
  MB_STATUS_LABELS,
} from "../../utils/acquisitionConstants";

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

function Select({ value, options, labels, onChange, colorMap }) {
  const color = colorMap?.[value];
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[6px] border bg-transparent px-1.5 py-1 text-[11px]"
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

function YesNoToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="rounded-full border px-2 py-[3px] text-[11px] font-medium"
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

export default function AcquisitionCreatorsTable({
  rows,
  sort,
  onSort,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onUpdate,
  onDelete,
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return (
    <div className="overflow-x-auto rounded-[12px] border" style={{ borderColor: "var(--ln)", background: "var(--panel)" }}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}>
            <th className={th}>
              <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
            </th>
            <th className={th}>Name</th>
            <th className={th}><SortHeader label="Subscribers" sortKey="subscribers" sort={sort} onSort={onSort} /></th>
            <th className={th}>Mail</th>
            <th className={th}>Number</th>
            <th className={th}>Category</th>
            <th className={th}>Execution Stage</th>
            <th className={th}>Convert</th>
            <th className={th}>Marketing Budget</th>
            <th className={th}>MB1</th>
            <th className={th}>MB2</th>
            <th className={th}>MB3</th>
            <th className={th}><SortHeader label="Date of Joining" sortKey="dateOfJoining" sort={sort} onSort={onSort} /></th>
            <th className={th}><SortHeader label="Execution Date" sortKey="executionDate" sort={sort} onSort={onSort} /></th>
            <th className={th}>Handover to SMM</th>
            <th className={th}>Marketing Report</th>
            <th className={th}>Status</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
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
                  options={ACQ_CATEGORIES}
                  colorMap={ACQ_CATEGORY_COLORS}
                  onChange={(v) => onUpdate(r.id, { category: v })}
                />
              </td>
              <td className={td}>
                <Select
                  value={r.executionStage}
                  options={ACQ_EXECUTION_STAGES}
                  labels={ACQ_EXECUTION_STAGE_LABELS}
                  colorMap={ACQ_EXECUTION_STAGE_COLORS}
                  onChange={(v) => onUpdate(r.id, { executionStage: v })}
                />
              </td>
              <td className={td}>
                <YesNoToggle value={r.convert} onChange={(v) => onUpdate(r.id, { convert: v })} />
              </td>
              <td className={td}>
                <EditableCell value={r.marketingBudget ? String(r.marketingBudget) : ""} label="Marketing budget" onSave={(v) => onUpdate(r.id, { marketingBudget: v })} />
              </td>
              {["mb1Status", "mb2Status", "mb3Status"].map((field) => (
                <td className={td} key={field}>
                  <Select
                    value={r[field]}
                    options={MB_STATUS_OPTIONS}
                    labels={MB_STATUS_LABELS}
                    onChange={(v) => onUpdate(r.id, { [field]: v })}
                  />
                </td>
              ))}
              <td className={td}>
                <input
                  type="date"
                  value={r.dateOfJoining || ""}
                  onChange={(e) => onUpdate(r.id, { dateOfJoining: e.target.value })}
                  className="rounded-[6px] border bg-transparent px-1.5 py-1 text-[11px]"
                  style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
                />
              </td>
              <td className={td}>
                <input
                  type="date"
                  value={r.executionDate || ""}
                  onChange={(e) => onUpdate(r.id, { executionDate: e.target.value })}
                  className="rounded-[6px] border bg-transparent px-1.5 py-1 text-[11px]"
                  style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
                />
              </td>
              <td className={td}>
                <YesNoToggle value={r.handoverToSmm} onChange={(v) => onUpdate(r.id, { handoverToSmm: v })} />
              </td>
              <td className={td}>
                <EditableCell value={r.marketingReport} label="Marketing report" onSave={(v) => onUpdate(r.id, { marketingReport: v })} />
              </td>
              <td className={td}>
                <EditableCell value={r.status} label="Status" variant="pill" onSave={(v) => onUpdate(r.id, { status: v })} />
              </td>
              <td className={td}>
                <button type="button" onClick={() => onDelete(r.id)} title="Remove" style={{ color: "var(--ink3)" }}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={17} style={{ color: "var(--ink3)", textAlign: "center", padding: "24px" }}>
                No creators match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
