/**
 * 4-up stats row — mirrors the approved HTML's `.stats` / `.stat` markup.
 */
export default function StatsCards({ count, avgFollowers, topLanguage, topNiche, topPlatform }) {
  const stats = [
    { label: "Creators shown", value: count },
    { label: "Avg Followers", value: avgFollowers },
    { label: "Top language", value: topLanguage },
    { label: "Top niche", value: topNiche },
    { label: "Top platform", value: topPlatform },
  ];

  return (
    <div className="mb-[18px] grid grid-cols-5 gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-[11px] border px-3.5 py-3 shadow-[0_1px_2px_rgba(16,36,62,.04)]"
          style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
        >
          <div
            className="mb-[5px] text-[11px] uppercase tracking-[.07em]"
            style={{ color: "var(--ink3)" }}
          >
            {s.label}
          </div>
          <div
            className="text-xl font-semibold"
            style={{
              color: "var(--ink)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
