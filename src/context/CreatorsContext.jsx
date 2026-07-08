import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { CreatorsContext } from "./creatorsContextDef";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import {
  getSavedSheetLink,
  saveSheetLink,
  clearSavedSheetLink,
  syncFromSheetUrl,
} from "../utils/sheetSync";
import { dedupeKey } from "../utils/csvImport";

// Local cache of the creators list, so a reload shows the last-known data
// immediately instead of a blank table while Supabase loads. Supabase is
// the real, shared source of truth now — this is purely a fast-paint cache.
const CREATORS_CACHE_KEY = "cm_creators_cache";

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

const CREATOR_FIELD_MAP = {
  name: "name",
  phone: "phone",
  email: "email",
  platform: "platform",
  profileLink: "profile_link",
  followers: "followers",
  gender: "gender",
  category: "category",
  language: "language",
  tier: "tier",
  remark: "remark",
  quit: "quit",
  commercial: "commercial",
};

function creatorFromRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    platform: row.platform || "",
    profileLink: row.profile_link || "",
    followers: row.followers || 0,
    gender: row.gender || "",
    category: row.category || "",
    language: row.language || "",
    tier: row.tier || "",
    remark: row.remark || "",
    quit: row.quit || false,
    commercial: row.commercial ?? "",
  };
}

function toCreatorColumns(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = CREATOR_FIELD_MAP[k];
    if (col) out[col] = v;
  });
  return out;
}

// Only these base fields (never remark/quit/commercial — the fields
// edited inside the app) get pushed during a sheet sync, so a sync never
// overwrites something someone typed in the CRM itself.
const SHEET_SYNCED_FIELDS = [
  "name", "phone", "email", "platform", "profileLink",
  "followers", "gender", "category", "language", "tier",
];

export function CreatorsProvider({ children }) {
  const { user } = useAuth();
  const [creators, setCreators] = useState(() => loadCachedCreators());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    try {
      localStorage.setItem(CREATORS_CACHE_KEY, JSON.stringify(creators));
    } catch {
      // Ignore quota/availability errors — in-memory state still works.
    }
  }, [creators]);

  // Loads the real, shared list from Supabase — this is what makes an
  // edit one teammate makes visible to everyone else.
  const loadFromSupabase = useCallback(async () => {
    const { data, error } = await supabase.from("creators").select("*");
    if (error) {
      console.error("Failed to load creators:", error.message);
      return;
    }
    setCreators((data || []).map(creatorFromRow));
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadFromSupabase().finally(() => setLoading(false));
  }, [user, loadFromSupabase]);

  const updateCreatorField = useCallback((id, field, value) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    const col = CREATOR_FIELD_MAP[field];
    if (!col) return;
    supabase
      .from("creators")
      .update({ [col]: value })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to save creator change:", error.message);
      });
  }, []);

  const deleteCreators = useCallback((ids) => {
    const idSet = new Set(ids);
    setCreators((prev) => prev.filter((c) => !idSet.has(c.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      idSet.forEach((id) => next.delete(id));
      return next;
    });
    supabase
      .from("creators")
      .delete()
      .in("id", ids)
      .then(({ error }) => {
        if (error) console.error("Failed to delete creators:", error.message);
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

  // Pushes the sheet-owned fields for every creator in `rows` into
  // Supabase, matched by the same name+phone+platform key the sheet sync
  // already uses internally. Never touches remark/quit/commercial, so an
  // in-app edit always survives the next sync.
  const pushBaseFieldsToSupabase = useCallback(async (rows) => {
    const payload = rows.map((r) => {
      const cols = toCreatorColumns(
        Object.fromEntries(SHEET_SYNCED_FIELDS.map((k) => [k, r[k]]))
      );
      return { ...cols, dedupe_key: dedupeKey(r) };
    });
    if (payload.length === 0) return;
    const { error } = await supabase
      .from("creators")
      .upsert(payload, { onConflict: "dedupe_key" });
    if (error) {
      console.error("Failed to save synced creators:", error.message);
    }
  }, []);

  // Single entry point for pulling from a linked sheet — used for the very
  // first sync when the app opens, the silent background refresh, and the
  // manual "Connect & sync" / "Sync now" actions in the import modal.
  const syncNow = useCallback(
    async (rawUrl, { mirror = false } = {}) => {
      setSyncStatus("syncing");
      try {
        const { merged, added, updated, removed, rowErrors } = await syncFromSheetUrl(
          rawUrl,
          creatorsRef.current,
          { mirror }
        );
        await pushBaseFieldsToSupabase(merged);
        // Re-load from Supabase so every row carries its real database id
        // and whatever remark/quit/commercial already existed for it,
        // instead of trusting the local merge's temporary ids.
        await loadFromSupabase();
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
    },
    [pushBaseFieldsToSupabase, loadFromSupabase]
  );

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

  // The moment the app opens (and someone's logged in): if a sheet is
  // linked, sync immediately, then keep quietly refreshing in the
  // background. Background syncs never surface a toast — only the manual
  // "Sync now" button does.
  useEffect(() => {
    if (!user) return;

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
  }, [syncNow, user]);

  const value = useMemo(
    () => ({
      creators,
      setCreators,
      loading,
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
      loading,
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