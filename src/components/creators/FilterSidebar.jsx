import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import RangeSlider from "./RangeSlider";
import PlatformIcon, { platformLabel } from "../ui/PlatformIcon";
import {
  TIERS,
  TIER_LABELS,
  TIER_RANGE_LABELS,
} from "../../utils/constants";

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

/**
 * City picker. There are far too many cities for a chip list — every one
 * in the database used to render as its own button, which pushed the rest
 * of the filters off the screen. This collapses them into one control
 * that opens a searchable, scrollable checkbox list instead.
 */
function CityMultiSelect({ cities, activeCities, onToggle, onClearAll }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  // Close when clicking anywhere outside the control.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Selected cities always sit at the top, so what you've picked never
  // scrolls out of reach behind a long list.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
    const selected = matches.filter((c) => activeCities.has(c));
    const rest = matches.filter((c) => !activeCities.has(c));
    return [...selected, ...rest];
  }, [cities, query, activeCities]);

  const count = activeCities.size;
  const summary = count === 0 ? "All cities" : count === 1 ? Array.from(activeCities)[0] : `${count} cities selected`;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-[9px] border px-3 py-2 text-[13px] transition-colors"
        style={{
          background: "var(--up)",
          borderColor: count > 0 ? "var(--am)" : "var(--ln)",
          color: count > 0 ? "var(--ink)" : "var(--ink2)",
        }}
      >
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">{summary}</span>
        <ChevronDown size={14} style={{ color: "var(--ink3)" }} />
      </button>

      {count > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Array.from(activeCities).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onToggle(c)}
              className="flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px]"
              style={{ borderColor: "var(--am)", background: "rgba(30,111,224,.06)", color: "var(--ink2)" }}
              title={`Remove ${c}`}
            >
              {c}
              <X size={10} />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-full px-2 py-[3px] text-[11px] underline"
            style={{ color: "var(--ink3)" }}
          >
            Clear
          </button>
        </div>
      )}

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 rounded-[10px] border shadow-[0_8px_28px_rgba(16,36,62,.18)]"
          style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
        >
          <div className="border-b p-2" style={{ borderColor: "var(--ln)" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={"Type to find a city\u2026"}
              autoFocus
              className="w-full rounded-[7px] border px-2.5 py-1.5 text-xs outline-none"
              style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)" }}
            />
          </div>
          <div className="max-h-[240px] overflow-auto py-1">
            {visible.length === 0 ? (
              <div className="px-3 py-3 text-center text-[11px]" style={{ color: "var(--ink3)" }}>
                No city matches that
              </div>
            ) : (
              visible.map((c) => {
                const on = activeCities.has(c);
                return (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px]"
                    style={{ color: on ? "var(--ink)" : "var(--ink2)" }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggle(c)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
                    />
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{c}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilterSidebar({
  search,
  setSearch,
  activePlatforms,
  togglePlatform,
  platforms,
  activeGenders,
  toggleGender,
  genders,
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
  activeCities,
  toggleCity,
  cities = [],
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
          {platforms.map((plat) => {
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
                <PlatformIcon platform={plat} size={15} />
                {platformLabel(plat)}
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
          {genders.map((g) => {
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

      {/* City */}
      {cities.length > 0 && (
        <div className="fg mb-[18px]">
          <div
            className="fl mb-[9px] text-[11px] font-semibold uppercase tracking-[.07em]"
            style={{ color: "var(--ink3)" }}
          >
            City
          </div>
          <CityMultiSelect
            cities={cities}
            activeCities={activeCities}
            onToggle={toggleCity}
            onClearAll={() => activeCities.forEach((c) => toggleCity(c))}
          />
        </div>
      )}

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