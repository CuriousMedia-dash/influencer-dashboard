import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { CreatorsContext } from "./creatorsContextDef";
import {
  getSavedSheetLink,
  saveSheetLink,
  clearSavedSheetLink,
  syncFromSheetUrl,
} from "../utils/sheetSync";

// Local cache of the creators list, so a reload shows the last-known data
// immediately instead of a blank table while the background sync runs.
// The linked Google Sheet (if any) is still the source of truth — this is
// only a fast-paint cache, kept in sync every time `creators` changes.
const CREATORS_CACHE_KEY = "cm_creators_cache";

// Anywhere in 5-10s per the original design — 7s splits the difference.
const AUTO_SYNC_INTERVAL_MS = 7000;

function loadCachedCreators() {
  try {
    const raw = localStorage.getItem(CREATORS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CreatorsProvider({ children }) {
  const [creators, setCreators] = useState(() => loadCachedCreators());
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // ── Linked-sheet sync state, shared by the header status pill, the
  // import/link modal, and the silent background auto-sync below. ──
  const [sheetLink, setSheetLink] = useState(() => getSavedSheetLink());
  const [syncStatus, setSyncStatus] = useState(() =>
    getSavedSheetLink()?.url ? "idle" : "not_connected"
  );
  const [syncError, setSyncError] = useState("");

  const creatorsRef = useRef(creators);
  const syncingRef = useRef(false);
  useEffect(() => {
    creatorsRef.current = creators;
  }, [creators]);

  // Keep the fast-paint cache fresh.
  useEffect(() => {
    try {
      localStorage.setItem(CREATORS_CACHE_KEY, JSON.stringify(creators));
    } catch {
      // Ignore quota/availability errors (e.g. private browsing) — the
      // in-memory state still works fine for the current session.
    }
  }, [creators]);

  const updateCreatorField = useCallback((id, field, value) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }, []);

  const deleteCreators = useCallback((ids) => {
    const idSet = new Set(ids);
    setCreators((prev) => prev.filter((c) => !idSet.has(c.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      idSet.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const deleteCreator = useCallback(
    (id) => deleteCreators([id]),
    [deleteCreators]
  );

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids, shouldSelect) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const getCreatorById = useCallback(
    (id) => creators.find((c) => c.id === id),
    [creators]
  );

  const selectedCreators = useMemo(
    () => creators.filter((c) => selectedIds.has(c.id)),
    [creators, selectedIds]
  );

  // Single entry point for pulling from a linked sheet — used for the very
  // first sync when the app opens, the silent background refresh, and the
  // manual "Connect & sync" / "Sync now" actions in the import modal, so
  // they all share identical behavior and update the same shared status.
  const syncNow = useCallback(async (rawUrl, { mirror = false } = {}) => {
    setSyncStatus("syncing");
    try {
      const { merged, added, updated, removed, rowErrors } = await syncFromSheetUrl(
        rawUrl,
        creatorsRef.current,
        { mirror }
      );
      setCreators(merged);
      const record = { url: rawUrl, lastSyncedAt: new Date().toISOString(), mirror };
      saveSheetLink(record);
      setSheetLink(record);
      setSyncStatus("synced");
      setSyncError("");
      return { added, updated, removed, rowErrors };
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err?.message || "Something went wrong while syncing.");
      throw err;
    }
  }, []);

  const unlinkSheet = useCallback(() => {
    clearSavedSheetLink();
    setSheetLink(null);
    setSyncStatus("not_connected");
    setSyncError("");
  }, []);

  const setSheetMirror = useCallback((mirror) => {
    setSheetLink((prev) => {
      if (!prev?.url) return prev;
      const record = { ...prev, mirror };
      saveSheetLink(record);
      return record;
    });
  }, []);

  // The moment the app opens: if a sheet is linked, sync immediately (not
  // on the next 7s tick), then keep quietly refreshing in the background.
  // Background syncs never surface a toast/message — the header status
  // pill reflects state instead — only the manual "Sync now" button does.
  useEffect(() => {
    async function backgroundSync() {
      const linked = getSavedSheetLink();
      if (!linked?.url || syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncNow(linked.url, { mirror: Boolean(linked.mirror) });
      } catch {
        // Swallowed on purpose — a brief network hiccup shouldn't
        // interrupt the user. The status pill already reflects the error.
      } finally {
        syncingRef.current = false;
      }
    }

    backgroundSync();
    const interval = setInterval(backgroundSync, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [syncNow]);

  const value = useMemo(
    () => ({
      creators,
      setCreators,
      updateCreatorField,
      deleteCreator,
      deleteCreators,
      selectedIds,
      toggleSelected,
      selectMany,
      clearSelection,
      selectedCreators,
      getCreatorById,
      sheetLink,
      syncStatus,
      syncError,
      syncNow,
      unlinkSheet,
      setSheetMirror,
    }),
    [
      creators,
      updateCreatorField,
      deleteCreator,
      deleteCreators,
      selectedIds,
      toggleSelected,
      selectMany,
      clearSelection,
      selectedCreators,
      getCreatorById,
      sheetLink,
      syncStatus,
      syncError,
      syncNow,
      unlinkSheet,
      setSheetMirror,
    ]
  );

  return (
    <CreatorsContext.Provider value={value}>
      {children}
    </CreatorsContext.Provider>
  );
}
