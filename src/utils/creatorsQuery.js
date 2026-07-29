// Central place that turns the app's filter state into a Supabase query.
// Used by every place that needs to know "which creators match the
// current filters" — the paginated row fetch, the exact-count fetch, and
// the "select all matching filters" id fetch — so all three always agree
// on exactly the same set of rows.

import { supabase } from "../lib/supabaseClient";
import { TIER_RANGES } from "./constants";

/**
 * @param {*} query   a supabase-js query builder, e.g. supabase.from("creators").select("*")
 * @param {*} filters { activeNiches, activeLangs, activeCities, activePlatforms,
 *                       activeGenders, activeTiers, range, search } — Sets/array/string
 */
export function applyCreatorFilters(query, filters = {}) {
  const {
    activeNiches,
    activeLangs,
    activeCities,
    activePlatforms,
    activeGenders,
    activeTiers,
    range,
    search,
  } = filters;

  let q = query.is("deleted_at", null);

  if (activeNiches?.size) q = q.in("category", Array.from(activeNiches));
  if (activeLangs?.size) q = q.in("language", Array.from(activeLangs));
  if (activeCities?.size) q = q.in("city", Array.from(activeCities));
  if (activePlatforms?.size) q = q.in("platform", Array.from(activePlatforms));
  if (activeGenders?.size) q = q.in("gender", Array.from(activeGenders));

  if (activeTiers?.size) {
    const orParts = Array.from(activeTiers).map((t) => {
      const [lo, hi] = TIER_RANGES[t] || [0, Infinity];
      return hi === Infinity
        ? `followers.gte.${lo}`
        : `and(followers.gte.${lo},followers.lte.${hi})`;
    });
    q = q.or(orParts.join(","));
  }

  const [mn, mx] = range || [];
  if (typeof mn === "number" && Number.isFinite(mn)) q = q.gte("followers", mn);
  if (typeof mx === "number" && Number.isFinite(mx)) q = q.lte("followers", mx);

  if (search && search.trim()) {
    // Escape PostgREST's ilike pattern-matching characters so a literal
    // "%" or "_" typed into search doesn't act as a wildcard.
    const escaped = search.trim().replace(/[%_]/g, (m) => `\\${m}`);
    q = q.ilike("name", `%${escaped}%`);
  }

  return q;
}

// "Category" (the tier badge, key "tier") sorts by the same underlying
// followers value that determines the badge — there's no separate tier
// column to sort by.
const SORT_COLUMN_MAP = {
  name: "name",
  followers: "followers",
  gender: "gender",
  category: "category",
  language: "language",
  city: "city",
  tier: "followers",
};

export function applyCreatorSort(query, sortKey, sortDir) {
  const col = SORT_COLUMN_MAP[sortKey] || "followers";
  return query.order(col, { ascending: sortDir === 1 });
}

// Fetches every id matching the current filters — used for "select all N
// creators matching these filters," not just the ones currently loaded on
// screen. Paged internally in chunks of 1000 so this stays safe even
// against a 50,000+ row result.
export async function fetchAllMatchingIds(filters) {
  const ids = [];
  const CHUNK = 1000;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from("creators").select("id");
    query = applyCreatorFilters(query, filters);
    query = query.range(offset, offset + CHUNK - 1);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch matching creator ids:", error.message);
      break;
    }
    (data || []).forEach((row) => ids.push(row.id));
    if (!data || data.length < CHUNK) break;
    offset += CHUNK;
  }
  return ids;
}
