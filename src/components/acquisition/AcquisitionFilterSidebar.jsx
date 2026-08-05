import { Search } from "lucide-react";

function ChipGroup({ values, colorMap, activeSet, onToggle }) {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {values.map((val) => {
        const color = colorMap[val] || "#1E6FE0";
        const on = activeSet.has(val);
        return (
          <button
            key={val}
            type="button"
            onClick={() => onToggle(val)}
            className="flex items-center gap-[5px] rounded-full border px-2.5 py-[5px] text-xs transition-colors"
            style={{
              background: "var(--up)",
              borderColor: on ? color : "var(--ln)",
              color: on ? "var(--ink)" : "var(--ink2)",
            }}
          >
            <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full" style={{ background: on ? color : "var(--ink3)" }} />
            {val}
          </button>
        );
      })}
    </div>
  );
}

function TriToggle({ label, value, onChange }) {
  const options = [
    { key: "all", label: "All" },
    { key: "yes", label: "Yes" },
    { key: "no", label: "No" },
  ];
  return (
    <div className="fg mb-[18px]">
      <div className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]" style={{ color: "var(--ink3)" }}>
        {label}
      </div>
      <div className="flex gap-[5px]">
        {options.map((opt) => {
          const on = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className="flex-1 rounded-full border px-2.5 py-[5px] text-xs transition-colors"
              style={{
                background: on ? "var(--am)" : "var(--up)",
                borderColor: on ? "var(--am)" : "var(--ln)",
                color: on ? "#fff" : "var(--ink2)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Plain min/max number inputs instead of a slider — no dependency on the
// current data's min/max, so it works correctly with 0 creators, 3
// creators, or 300,000 creators alike, and there's no artificial ceiling.
function SubscriberRange({ value, onChange }) {
  const [min, max] = value; // max === null means "no upper limit"
  return (
    <div className="fg mb-[18px]">
      <div className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]" style={{ color: "var(--ink3)" }}>
        Subscribers
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={min || ""}
          onChange={(e) => onChange([e.target.value === "" ? 0 : Number(e.target.value), max])}
          placeholder="Min"
          className="w-full rounded-lg border py-2 px-2.5 text-[13px] outline-none"
          style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)" }}
        />
        <span style={{ color: "var(--ink3)" }}>–</span>
        <input
          type="number"
          min={0}
          value={max ?? ""}
          onChange={(e) => onChange([min, e.target.value === "" ? null : Number(e.target.value)])}
          placeholder="Max"
          className="w-full rounded-lg border py-2 px-2.5 text-[13px] outline-none"
          style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)" }}
        />
      </div>
    </div>
  );
}

/**
 * filters shape:
 * { search, subscriberRange: [min, max|null], categories: Set<string>, convert: "all"|"yes"|"no", handover: "all"|"yes"|"no" }
 * subscriberRange max of null means "no upper limit".
 */
export default function AcquisitionFilterSidebar({ filters, onChange, categories = [], categoryColors = {}, handoverLabel = "Handover to SMM" }) {
  const toggleCategory = (cat) => {
    const next = new Set(filters.categories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange({ ...filters, categories: next });
  };

  return (
    <aside
      className="rounded-[13px] border p-4 shadow-[0_1px_2px_rgba(16,36,62,.04)]"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      {/* Search */}
      <div className="fg mb-[18px]">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2" style={{ color: "var(--ink3)" }} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by name…"
            className="w-full rounded-lg border py-2 pl-8 pr-2.5 text-[13px] outline-none"
            style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)" }}
          />
        </div>
      </div>

      <SubscriberRange value={filters.subscriberRange} onChange={(range) => onChange({ ...filters, subscriberRange: range })} />

      <div className="fg mb-[18px]">
        <div className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]" style={{ color: "var(--ink3)" }}>
          Category
        </div>
        <ChipGroup values={categories} colorMap={categoryColors} activeSet={filters.categories} onToggle={toggleCategory} />
      </div>

      <TriToggle label="Converted" value={filters.convert} onChange={(v) => onChange({ ...filters, convert: v })} />
      <TriToggle label={handoverLabel} value={filters.handover} onChange={(v) => onChange({ ...filters, handover: v })} />

      <button
        type="button"
        onClick={() =>
          onChange({ search: "", subscriberRange: [0, null], categories: new Set(), convert: "all", handover: "all" })
        }
        className="w-full rounded-[9px] border py-2 text-[12px] font-medium transition-colors"
        style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
      >
        Clear filters
      </button>
    </aside>
  );
}