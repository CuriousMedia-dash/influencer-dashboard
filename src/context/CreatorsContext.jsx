import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { CreatorsContext } from "./creatorsContextDef";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { syncFromSheetUrl } from "../utils/sheetSync";
import { dedupeKey } from "../utils/csvImport";

// Local cache of the creators list, so a reload shows the last-known data
// immediately instead of a blank table while Supabase loads. Supabase is
// the real, shared source of truth now — this is purely a fast-paint cache.
const CREATORS_CACHE_KEY = "cm_creators_cache";

// The master sheet link used to live per-browser in localStorage — every
// admin had to link their own copy, and nobody else ever saw it. It now
// lives in the shared `app_settings` table (key = "master_sheet"), so
// every teammate automatically syncs from the exact same sheet, and only
// admins can change which sheet that is (enforced by RLS on that table,
// not just by hiding buttons here).
const MASTER_SHEET_KEY = "master_sheet";


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
  const { user, isAdmin } = useAuth();
  const [creators, setCreators] = useState(() => loadCachedCreators());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  const [sheetLink, setSheetLink] = useState(null);
  const [syncStatus, setSyncStatus] = useState("not_connected");
  const [syncError, setSyncError] = useState("");

  // Separate status for the one-time "add creators from another sheet"
  // import — kept apart from the master sheet's syncStatus so importing
  // doesn't make the header pill think the master sheet is mid-sync.
  const [importStatus, setImportStatus] = useState("idle");
  const [importError, setImportError] = useState("");

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

  // Loads the shared master sheet link/settings — any authenticated
  // teammate can read this (needed so everyone's background sync works),
  // only admins can change it.
  const loadMasterSheet = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", MASTER_SHEET_KEY)
      .maybeSingle();
    if (error) {
      console.error("Failed to load master sheet link:", error.message);
      return;
    }
    const value = data?.value || null;
    setSheetLink(value);
    setSyncStatus(value?.url ? "idle" : "not_connected");
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([loadFromSupabase(), loadMasterSheet()]).finally(() => setLoading(false));
  }, [user, loadFromSupabase, loadMasterSheet]);

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
  // in-app edit always survives the next sync. `source`, when given, is
  // stamped onto every row in this call — used to tell "came from the
  // Google Sheet" apart from "added via CSV upload", so a sheet mirror
  // sync can never delete something a CSV upload added. `commercialForKeys`,
  // when given, is a Set of dedupe keys — only those rows also get their
  // Commercial value pushed, so a sheet's rate/commercial column can
  // populate a brand-new creator's starting value without ever
  // overwriting a value someone's already edited in-app for an existing
  // one.
  const pushBaseFieldsToSupabase = useCallback(async (rows, source, commercialForKeys) => {
    const payload = rows.map((r) => {
      const key = dedupeKey(r);
      const fields = commercialForKeys?.has(key)
        ? [...SHEET_SYNCED_FIELDS, "commercial"]
        : SHEET_SYNCED_FIELDS;
      const cols = toCreatorColumns(
        Object.fromEntries(fields.map((k) => [k, r[k]]))
      );
      const row = { ...cols, dedupe_key: key };
      if (source) row.source = source;
      return row;
    });
    if (payload.length === 0) return;
    const { error } = await supabase
      .from("creators")
      .upsert(payload, { onConflict: "dedupe_key" });
    if (error) {
      console.error("Failed to save synced creators:", error.message);
    }
  }, []);

  // Single entry point for pulling from the MASTER sheet — used for the
  // very first sync when the app opens, the silent background refresh,
  // and the manual "Connect & sync" / "Sync now" / "Change link" actions.
  // Also updates the shared master-sheet setting (admin-only, enforced by
  // RLS — a non-admin's write here is silently rejected by the database).
  const syncNow = useCallback(
    async (rawUrl, { mirror = false } = {}) => {
      setSyncStatus("syncing");
      try {
        const beforeSync = creatorsRef.current;
        const { merged, added, updated, removed, addedKeys, rowErrors } = await syncFromSheetUrl(
          rawUrl,
          beforeSync,
          { mirror }
        );
        // Every row here is sheet-sourced, whether brand new or an
        // update to something that already existed. Commercial only
        // comes along for the genuinely new ones.
        await pushBaseFieldsToSupabase(merged, "sheet", new Set(addedKeys));

        // Mirror mode's actual deletion happens here — and only for
        // creators whose source is genuinely "sheet". A creator added
        // through CSV upload can never be removed by this, even if it's
        // not present in the sheet, because it was never sheet-sourced
        // to begin with.
        if (mirror) {
          const mergedIds = new Set(merged.map((c) => c.id));
          const removedIds = beforeSync.filter((c) => !mergedIds.has(c.id)).map((c) => c.id);
          if (removedIds.length > 0) {
            const { error: deleteError } = await supabase
              .from("creators")
              .delete()
              .in("id", removedIds)
              .eq("source", "sheet");
            if (deleteError) {
              console.error("Failed to remove creators no longer in the sheet:", deleteError.message);
            }
          }
        }

        // Re-load from Supabase so every row carries its real database id
        // and whatever remark/quit/commercial already existed for it,
        // instead of trusting the local merge's temporary ids.
        await loadFromSupabase();

        const record = { url: rawUrl, lastSyncedAt: new Date().toISOString(), mirror };
        const { error: settingsError } = await supabase.from("app_settings").upsert(
          { key: MASTER_SHEET_KEY, value: record, updated_by: user?.id },
          { onConflict: "key" }
        );
        if (settingsError) {
          console.error("Failed to save master sheet link:", settingsError.message);
        } else {
          setSheetLink(record);
        }

        setSyncStatus("synced");
        setSyncError("");
        return { added, updated, removed, rowErrors };
      } catch (err) {
        setSyncStatus("error");
        setSyncError(err?.message || "Something went wrong while syncing.");
        throw err;
      }
    },
    [pushBaseFieldsToSupabase, loadFromSupabase, user]
  );

  // One-time "add creators from another sheet" — merges whatever's in the
  // given sheet into the same shared creators list, but never touches the
  // master sheet setting above. Doesn't affect what the background sync
  // keeps pulling from. Never removes anything (mirror is always off
  // here), so there's no deletion step needed.
  const importFromSheet = useCallback(
    async (rawUrl) => {
      setImportStatus("importing");
      setImportError("");
      try {
        const { merged, added, updated, addedKeys, rowErrors } = await syncFromSheetUrl(
          rawUrl,
          creatorsRef.current,
          { mirror: false }
        );
        await pushBaseFieldsToSupabase(merged, "sheet", new Set(addedKeys));
        await loadFromSupabase();
        setImportStatus("done");
        return { added, updated, rowErrors };
      } catch (err) {
        setImportStatus("error");
        setImportError(err?.message || "Something went wrong while importing.");
        throw err;
      }
    },
    [pushBaseFieldsToSupabase, loadFromSupabase]
  );

  // Confirms a local file upload (CSV or Excel) by actually saving it to
  // Supabase — the base fields only, same as a sheet sync would, so any
  // in-app edits (remark/quit/commercial) on existing creators are left
  // alone. `addedKeys` (the dedupe keys of rows that are genuinely new,
  // from syncCreators) get tagged source: "upload" — existing creators
  // being updated keep whatever source they already had, so re-uploading
  // a CSV that happens to include sheet-sourced creators can never
  // reclassify them as upload-only and put them at risk of nothing (they
  // were never at risk from CSV anyway — uploads never delete).
  const confirmLocalImport = useCallback(
    async (mergedRows, { addedKeys = [] } = {}) => {
      const addedKeySet = new Set(addedKeys);
      const newRows = mergedRows.filter((r) => addedKeySet.has(dedupeKey(r)));
      const existingRows = mergedRows.filter((r) => !addedKeySet.has(dedupeKey(r)));

      if (newRows.length > 0) await pushBaseFieldsToSupabase(newRows, "upload", addedKeySet);
      if (existingRows.length > 0) await pushBaseFieldsToSupabase(existingRows);

      await loadFromSupabase();
    },
    [pushBaseFieldsToSupabase, loadFromSupabase]
  );

  const unlinkSheet = useCallback(async () => {
    const { error } = await supabase.from("app_settings").delete().eq("key", MASTER_SHEET_KEY);
    if (error) {
      console.error("Failed to unlink master sheet:", error.message);
      return;
    }
    setSheetLink(null);
    setSyncStatus("not_connected");
    setSyncError("");
  }, []);

  const setSheetMirror = useCallback(
    async (mirror) => {
      if (!sheetLink?.url) return;
      const record = { ...sheetLink, mirror };
      const { error } = await supabase.from("app_settings").upsert(
        { key: MASTER_SHEET_KEY, value: record, updated_by: user?.id },
        { onConflict: "key" }
      );
      if (error) {
        console.error("Failed to update mirror setting:", error.message);
        return;
      }
      setSheetLink(record);
    },
    [sheetLink, user]
  );

  // The moment the app opens (and someone's logged in): if the shared
  // master sheet is linked, sync once — and only once per app session,
  // not repeatedly. From then on, syncing only happens when someone
  // explicitly clicks "Sync now". This also fixes a real bug the old
  // repeating version had: if a background sync was still in flight with
  // the *old* link right as someone connected a genuinely new one, the
  // old sync could finish last and silently overwrite the new link back
  // to the old one. A single one-time sync removes that race entirely.
  const didInitialSyncRef = useRef(false);
  useEffect(() => {
    if (!user || !sheetLink?.url) return;
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;

    async function initialSync() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncNow(sheetLink.url, { mirror: Boolean(sheetLink.mirror) });
      } catch {
        // Swallowed on purpose — a brief network hiccup shouldn't
        // interrupt the user. The status pill already reflects the error.
      } finally {
        syncingRef.current = false;
      }
    }

    initialSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sheetLink?.url]);

  const value = useMemo(
    () => ({
      creators,
      setCreators,
      loading,
      updateCreatorField,
      deleteCreator,
      confirmLocalImport,
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
      importFromSheet,
      importStatus,
      importError,
      isAdmin,
    }),
    [
      creators,
      loading,
      updateCreatorField,
      deleteCreator,
      confirmLocalImport,
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
      importFromSheet,
      importStatus,
      importError,
      isAdmin,
    ]
  );

  return (
    <CreatorsContext.Provider value={value}>
      {children}
    </CreatorsContext.Provider>
  );
}