/**
 * Tab row — mirrors the approved HTML's `.tabrow` / `.tab` classes exactly.
 * Switches between "creators" and "campaigns" views within the same page
 * (no route change), matching the original All Creators / My Wishlist tabs.
 */
export default function TabBar({ active, onChange, campaignCount }) {
  const tabs = [
    { key: "creators", label: "All Creators", icon: "\u25c9" },
    { key: "campaigns", label: "My Campaigns", icon: "\u2691", badge: campaignCount },
  ];

  return (
    <div
      className="mb-[18px] flex gap-1 rounded-[10px] border p-1 shadow-[0_1px_2px_rgba(16,36,62,.04)]"
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
              fontFamily: "Inter, sans-serif",
            }}
          >
            <span>{t.icon}</span>
            {t.label}
            {typeof t.badge === "number" && (
              <span
                className="rounded-full px-1.5 py-[1px] text-[10px] font-semibold"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: on ? "#FFFFFF" : "var(--up)",
                  color: "var(--am)",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
