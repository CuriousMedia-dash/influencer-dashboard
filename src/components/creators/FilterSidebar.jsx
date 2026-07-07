import { Search } from "lucide-react";
import RangeSlider from "./RangeSlider";
import {
  PLATFORMS,
  GENDERS,
  TIERS,
  TIER_LABELS,
  TIER_RANGE_LABELS,
} from "../../utils/constants";

const PLATFORM_ICONS = {
  Instagram: "\ud83d\udcf8",
  YouTube: "\u25b6",
  Twitter: "\ud835\udd4f",
  LinkedIn: "\ud83d\udcbc",
};

const GENDER_ICONS = {
  Male: "\u2642",
  Female: "\u2640",
  Others: "\u26a5",
};

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
            <span
              className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
              style={{ background: on ? color : "var(--ink3)" }}
            />
            {val}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterSidebar({
  search,
  setSearch,
  activePlatforms,
  togglePlatform,
  activeGenders,
  toggleGender,
  activeTiers,
  toggleTier,
  activeNiches,
  toggleNiche,
  niches,
  nicheColors,
  activeLangs,
  toggleLang,
  languages,
  langColors,
  range,
  setRange,
  followerBounds,
  onReset,
}) {
  return (
    <aside
      className="rounded-[13px] border p-4 shadow-[0_1px_2px_rgba(16,36,62,.04)]"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      {/* Search */}
      <div className="fg mb-[18px]">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2"
            style={{ color: "var(--ink3)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border py-2 pl-8 pr-2.5 text-[13px] outline-none"
            style={{
              background: "var(--up)",
              borderColor: "var(--ln)",
              color: "var(--ink)",
            }}
          />
        </div>
      </div>

      {/* Platform */}
      <div className="fg mb-[18px]">
        <div
          className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]"
          style={{ color: "var(--ink3)" }}
        >
          Platform
        </div>
        <div className="flex flex-col gap-1.5">
          {PLATFORMS.map((plat) => {
            const on = activePlatforms.has(plat);
            return (
              <button
                key={plat}
                type="button"
                onClick={() => togglePlatform(plat)}
                className="flex items-center gap-2 rounded-[9px] border px-3.5 py-2 text-[13px] font-medium transition-colors"
                style={{
                  borderColor: on ? "var(--am)" : "var(--ln)",
                  background: on ? "rgba(30,111,224,.06)" : "var(--up)",
                  color: on ? "var(--ink)" : "var(--ink2)",
                }}
              >
                <span className="text-base">{PLATFORM_ICONS[plat]}</span>
                {plat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gender */}
      <div className="fg mb-[18px]">
        <div
          className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]"
          style={{ color: "var(--ink3)" }}
        >
          Gender
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GENDERS.map((g) => {
            const on = activeGenders.has(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGender(g)}
                className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] border px-2.5 py-[7px] text-xs font-medium transition-colors"
                style={{
                  borderColor: on ? "var(--am)" : "var(--ln)",
                  background: on ? "rgba(30,111,224,.06)" : "var(--up)",
                  color: on ? "var(--ink)" : "var(--ink2)",
                }}
              >
                {GENDER_ICONS[g]} {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Creator Category (tier) */}
      <div className="fg mb-[18px]">
        <div
          className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]"
          style={{ color: "var(--ink3)" }}
        >
          Creator Category
        </div>
        <div className="flex flex-col gap-[5px]">
          {TIERS.map((t) => {
            const on = activeTiers.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTier(t)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[5px] text-[11px] transition-colors"
                style={{
                  background: "var(--up)",
                  borderColor: on ? "var(--am)" : "var(--ln)",
                  color: on ? "var(--ink)" : "var(--ink2)",
                }}
              >
                <span
                  className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
                  style={{ background: on ? "var(--am)" : "var(--ink3)" }}
                />
                {TIER_LABELS[t]}
                <span
                  className="ml-0.5 text-[10px]"
                  style={{ color: "var(--ink3)" }}
                >
                  {TIER_RANGE_LABELS[t]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Niche */}
      <div className="fg mb-[18px]">
        <div
          className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]"
          style={{ color: "var(--ink3)" }}
        >
          Niche
        </div>
        <ChipGroup
          values={niches}
          colorMap={nicheColors}
          activeSet={activeNiches}
          onToggle={toggleNiche}
        />
      </div>

      {/* Language */}
      <div className="fg mb-[18px]">
        <div
          className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]"
          style={{ color: "var(--ink3)" }}
        >
          Language
        </div>
        <ChipGroup
          values={languages}
          colorMap={langColors}
          activeSet={activeLangs}
          onToggle={toggleLang}
        />
      </div>

      {/* Follower range */}
      <RangeSlider
        min={followerBounds[0]}
        max={followerBounds[1]}
        value={range}
        onChange={setRange}
      />

      <button
        type="button"
        onClick={onReset}
        className="mt-1 w-full rounded-lg border py-2 text-xs transition-colors"
        style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
      >
        Reset all filters
      </button>
    </aside>
  );
}
