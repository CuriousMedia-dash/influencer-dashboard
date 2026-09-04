import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { creatorFromRow } from "../utils/creatorRow";
import { applyCreatorFilters, applyCreatorSort } from "../utils/creatorsQuery";

const PAGE_SIZE = 100;

/**
 * Loads the creators table page by page instead of all at once — this is
 * the actual fix for the app not scaling past a few thousand rows.
 * `filters` is the object returned by useCreatorFilters(); `refreshSignal`
 * is any value that should trigger a full reload from the top when it
 * changes (e.g. bumped after a CSV import finishes).
 */
export function usePaginatedCreators(filters, sortKey, sortDir, refreshSignal) {
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Guards against a slow, now-stale request (from filters that have
  // since changed again) overwriting rows from a newer request that
  // finished first.
  const requestIdRef = useRef(0);
  const rowsLengthRef = useRef(0);
  useEffect(() => {
    rowsLengthRef.current = rows.length;
  }, [rows]);

  // Stable string key so effects only re-run when the filters' actual
  // *values* change, not merely because useCreatorFilters returned a new
  // object reference this render.
  const filterKey = JSON.stringify({
    n: Array.from(filters.activeNiches || []),
    l: Array.from(filters.activeLangs || []),
    c: Array.from(filters.activeCities || []),
    p: Array.from(filters.activePlatforms || []),
    g: Array.from(filters.activeGenders || []),
    t: Array.from(filters.activeTiers || []),
    r: filters.range,
    s: filters.search,
  });

  const fetchPage = useCallback(async (offset, myRequestId) => {
    let query = supabase.from("creators").select("*");
    query = applyCreatorFilters(query, filters);
    query = applyCreatorSort(query, sortKey, sortDir);
    query = query.range(offset, offset + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (requestIdRef.current !== myRequestId) return; // superseded by a newer request
    if (error) {
      console.error("Failed to load creators:", error.message);
      setHasMore(false);
      return;
    }
    const newRows = (data || []).map(creatorFromRow);
    setRows((prev) => (offset === 0 ? newRows : [...prev, ...newRows]));
    setHasMore(newRows.length === PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, sortKey, sortDir]);

  // Reload from the top whenever filters, sort, or refreshSignal change.
  useEffect(() => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setRows([]);
    setHasMore(true);
    setTotalCount(null);

    const countPromise = (async () => {
      let countQuery = supabase.from("creators").select("id", { count: "exact", head: true });
      countQuery = applyCreatorFilters(countQuery, filters);
      const { count, error } = await countQuery;
      if (requestIdRef.current !== myRequestId) return;
      if (error) {
        console.error("Failed to count matching creators:", error.message);
        return;
      }
      setTotalCount(count ?? 0);
    })();

    Promise.all([fetchPage(0, myRequestId), countPromise]).finally(() => {
      if (requestIdRef.current === myRequestId) setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, sortKey, sortDir, refreshSignal]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const myRequestId = requestIdRef.current;
    setLoadingMore(true);
    fetchPage(rowsLengthRef.current, myRequestId).finally(() => setLoadingMore(false));
  }, [loading, loadingMore, hasMore, fetchPage]);

  // Optimistic local updates — patch/remove a row across whatever page
  // currently holds it, without needing a full reload for something as
  // small as one field edit or one deletion.
  const patchRow = useCallback((id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRows = useCallback((ids) => {
    const idSet = new Set(ids);
    setRows((prev) => prev.filter((r) => !idSet.has(r.id)));
    setTotalCount((prev) => (prev == null ? prev : Math.max(0, prev - idSet.size)));
  }, []);

  return { rows, totalCount, loading, loadingMore, hasMore, loadMore, patchRow, removeRows };
}
