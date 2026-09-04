import { useMemo, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const EMPTY_SET = new Set();

/**
 * Owns all Creators-page filter/sort UI state. No longer takes or
 * filters a `creators` array — filtering now happens server-side (see
 * usePaginatedCreators + utils/creatorsQuery). This hook only tracks
 * *which* filters are active and exposes them as a single `filterState`
 * object the data-fetching hook can turn into a query.
 */
export function useCreatorFilters() {
  const [search, setSearch] = useState("");
  // The input echoes `search` instantly — the debounced value is what
  // actually triggers a new server query, ~200ms after typing pauses.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(handle);
  }, [search]);

  const [activeNiches, setActiveNiches] = useState(() => new Set());
  const [activeLangs, setActiveLangs] = useState(() => new Set());
  const [activeCities, setActiveCities] = useState(() => new Set());
  const [activePlatforms, setActivePlatforms] = useState(() => new Set());
  const [activeGenders, setActiveGenders] = useState(() => new Set());
  const [activeTiers, setActiveTiers] = useState(() => new Set());
  const [sortKey, setSortKey] = useState("followers");
  const [sortDir, setSortDir] = useState(-1);

  // Follower min/max across the whole table (for the range slider's
  // bounds) and the list of distinct cities in use — both come from a
  // couple of small RPC calls instead of scanning every row client-side.
  // Fetched once on mount; a brand-new city typed into a creator's row
  // won't appear in the filter list until the next reload, which is an
  // acceptable trade-off for not re-scanning 50,000+ rows on every visit.
  const [followerBounds, setFollowerBounds] = useState([0, 1000000]);
  const [range, setRange] = useState([0, 1000000]);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("creators_followers_bounds")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load follower bounds:", error.message);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const bounds = [Number(row?.min_followers) || 0, Number(row?.max_followers) || 1000000];
        setFollowerBounds(bounds);
        setRange(bounds);
      });
    supabase
      .rpc("distinct_cities")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load cities:", error.message);
          setCitiesLoading(false);
          return;
        }
        setCities((data || []).map((r) => r.city).filter(Boolean));
        setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const toggleCity = useCallback((val) => {
    setActiveCities((prev) => {
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
    setActiveCities(new Set());
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

  // The shape the data-fetching hook (usePaginatedCreators) and the
  // "select all matching filters" action both consume.
  const filterState = useMemo(
    () => ({
      activeNiches,
      activeLangs,
      activeCities,
      activePlatforms,
      activeGenders,
      activeTiers,
      range,
      // Named `search` on purpose — this is the key applyCreatorFilters
      // reads. It used to be handed over as `debouncedSearch`, which that
      // function never looked at, so typing a name refetched the table
      // but never actually filtered it.
      search: debouncedSearch,
    }),
    [activeNiches, activeLangs, activeCities, activePlatforms, activeGenders, activeTiers, range, debouncedSearch]
  );

  return {
    search,
    setSearch,
    activeNiches: activeNiches || EMPTY_SET,
    activeLangs,
    activeCities,
    activePlatforms,
    activeGenders,
    activeTiers,
    toggleNiche,
    toggleLang,
    toggleCity,
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
    cities,
    citiesLoading,
    filterState,
  };
}
