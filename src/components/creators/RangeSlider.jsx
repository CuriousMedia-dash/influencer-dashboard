import { fmt } from "../../utils/format";

/**
 * Dual-handle follower range slider — mirrors the approved HTML's `.rs`
 * markup (two native range inputs layered with a filled track between them).
 */
export default function RangeSlider({ min, max, value, onChange }) {
  const [a, b] = value;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const span = max - min || 1;
  const leftPct = ((lo - min) / span) * 100;
  const widthPct = ((hi - lo) / span) * 100;
  const step = Math.max(1, Math.round((max - min) / 200));

  return (
    <div className="fg mb-[18px]">
      <div className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]" style={{ color: "var(--ink3)" }}>
        Follower Range
      </div>
      <div
        className="mb-[9px] flex justify-between text-xs"
        style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span>{fmt(lo)}</span>
        <span>{fmt(hi)}</span>
      </div>
      <div className="relative h-[26px]">
        <div
          className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded"
          style={{ background: "var(--ln)" }}
        />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded"
          style={{
            background: "var(--am)",
            left: `${leftPct}%`,
            width: `${widthPct}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={a}
          onChange={(e) => onChange([Number(e.target.value), b])}
          className="range-thumb pointer-events-none absolute left-0 top-0 h-[26px] w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={b}
          onChange={(e) => onChange([a, Number(e.target.value)])}
          className="range-thumb pointer-events-none absolute left-0 top-0 h-[26px] w-full appearance-none bg-transparent"
        />
      </div>
    </div>
  );
}
