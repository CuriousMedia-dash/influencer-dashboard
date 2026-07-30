/**
 * Tab row for the Creator Acquisition module — same visual pattern as
 * components/layout/TabBar.jsx (the Influencer Marketing tab bar):
 * full-width segmented pill, active tab filled var(--am) blue with white
 * text, inactive tabs transparent.
 */
export default function AcquisitionTabBar({ active, onChange }) {
  const tabs = [
    { key: "creators", label: "Creators", icon: "\u25c9" },
    { key: "influencers", label: "Influencers", icon: "\u2605" },
  ];

  return (
    <div
      className="flex flex-1 gap-1 rounded-[10px] border p-1 shadow-[0_1px_2px_rgba(16,36,62,.04)]"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] border px-3 py-2 text-[13px] transition-all"
            style={{
              background: on ? "var(--am)" : "transparent",
              borderColor: on ? "var(--am)" : "transparent",
              color: on ? "#FFFFFF" : "var(--ink2)",
              fontFamily: "'League Spartan', sans-serif",
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
