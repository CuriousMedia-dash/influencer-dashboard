import { useMemo, useState, useCallback } from "react";
import { inTier, platformNames } from "../utils/format";

const EMPTY_SET = new Set();

export function useCreatorFilters(creators) {
  const [search, setSearch] = useState("");
  const [activeNiches, setActiveNiches] = useState(() => new Set());
  const [activeLangs, setActiveLangs] = useState(() => new Set());
  const [activePlatforms, setActivePlatforms] = useState(() => new Set());
  const [activeGenders, setActiveGenders] = useState(() => new Set());
  const [activeTiers, setActiveTiers] = useState(() => new Set());
  const [sortKey, setSortKey] = useState("followers");
  const [sortDir, setSortDir] = useState(-1);

  const followerBounds = useMemo(() => {
    const vs = creators.map((r) => r.followers);
    let min = vs.length ? Math.min(...vs) : 0;
    let max = vs.length ? Math.max(...vs) : 1000000;
    if (max === min) max = min + 1000;
    return [min, max];
  }, [creators]);

  const [range, setRange] = useState(followerBounds);

  const toggleNiche = useCallback((val) => {
    setActiveNiches((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }, []);

  const toggleLang = useCallback((val) => {
    setActiveLangs((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }, []);

  const togglePlatform = useCallback((val) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }, []);

  const toggleGender = useCallback((val) => {
    setActiveGenders((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }, []);

  const toggleTier = useCallback((val) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setActiveNiches(new Set());
    setActiveLangs(new Set());
    setActivePlatforms(new Set());
    setActiveGenders(new Set());
    setActiveTiers(new Set());
    setSearch("");
    setRange(followerBounds);
  }, [followerBounds]);

  const sortBy = useCallback(
    (key) => {
      if (sortKey === key) {
        setSortDir((d) => d * -1);
      } else {
        setSortKey(key);
        setSortDir(1);
      }
    },
    [sortKey]
  );

  const filtered = useMemo(() => {
    const [mn, mx] = range;
    const lowerSearch = search.trim().toLowerCase();
    const result = creators.filter(
      (r) =>
        (activePlatforms.size === 0 ||
          platformNames(r).some((p) => activePlatforms.has(p))) &&
        (activeGenders.size === 0 || activeGenders.has(r.gender)) &&
        (activeNiches.size === 0 || activeNiches.has(r.category)) &&
        (activeLangs.size === 0 || activeLangs.has(r.language)) &&
        inTier(r.followers, activeTiers) &&
        r.followers >= mn &&
        r.followers <= mx &&
        (lowerSearch === "" || r.name.toLowerCase().includes(lowerSearch))
    );

    result.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "tier") {
        av = a.followers;
        bv = b.followers;
      }
      if (sortKey === "platforms") {
        av = platformNames(a).join(", ");
        bv = platformNames(b).join(", ");
      }
      if (typeof av === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });

    return result;
  }, [
    creators,
    activePlatforms,
    activeGenders,
    activeNiches,
    activeLangs,
    activeTiers,
    range,
    search,
    sortKey,
    sortDir,
  ]);

  return {
    search,
    setSearch,
    activeNiches: activeNiches || EMPTY_SET,
    activeLangs,
    activePlatforms,
    activeGenders,
    activeTiers,
    toggleNiche,
    toggleLang,
    togglePlatform,
    toggleGender,
    toggleTier,
    range,
    setRange,
    followerBounds,
    resetFilters,
    sortKey,
    sortDir,
    sortBy,
    filtered,
  };
}
