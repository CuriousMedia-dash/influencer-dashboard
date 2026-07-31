const OPTIONS = [
  { key: "mine", label: "My Creators" },
  { key: "fresh", label: "Fresh Lead" },
];

export default function AcquisitionViewToggle({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-[9px] border p-1" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
      {OPTIONS.map((opt) => {
        const on = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background: on ? "var(--am)" : "transparent",
              color: on ? "#fff" : "var(--ink2)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
