import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { CreatorsContext } from "./creatorsContextDef";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { dedupeKey } from "../utils/csvImport";
import { logActivity } from "../utils/activityLog";

// Local cache of the creators list, so a reload shows the last-known data
// immediately instead of a blank table while Supabase loads. Supabase is
// the real, shared source of truth now — this is purely a fast-paint cache.
const CREATORS_CACHE_KEY = "cm_creators_cache";

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
    deletedAt: row.deleted_at || null,
  };
}

// Columns in the database that only accept a real number — anything
// else (blank, "55,000" with a comma, "updating", free text) has to be
// converted to either a clean number or null before it's sent, or
// Postgres rejects the entire batch outright.
const NUMERIC_COLUMNS = new Set(["commercial"]);

function sanitizeNumericForDb(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw).replace(/,/g, "").trim();
  const num = Number(cleaned);
  // Anything that isn't a clean number after stripping commas — "updating",
  // "8000/home shoots-6,000", a name typed in the cell, etc. — becomes
  // "no value" rather than crashing the save.
  return Number.isFinite(num) ? num : null;
}

function toCreatorColumns(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = CREATOR_FIELD_MAP[k];
    if (!col) return;
    if (NUMERIC_COLUMNS.has(col)) {
      out[col] = sanitizeNumericForDb(v);
    } else {
      // A blank cell in the sheet comes through as "" — fine for text
      // columns, but turning it into null keeps things consistent.
      out[col] = v === "" ? null : v;
    }
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

  const creatorsRef = useRef(creators);
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

  // "Deleting" a creator only marks when it happened — the row itself,
  // and every campaign they were ever part of, stays intact. They're
  // just marked out of the active All Creators list from here on. Kept
  // in local state rather than removed entirely, so campaign history
  // pages can still resolve and show their name correctly.
  const deleteCreators = useCallback((ids) => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    const deletedNames = creatorsRef.current.filter((c) => idSet.has(c.id)).map((c) => c.name);
    setCreators((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, deletedAt: now } : c)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      idSet.forEach((id) => next.delete(id));
      return next;
    });
    supabase
      .from("creators")
      .update({ deleted_at: now })
      .in("id", ids)
      .then(({ error }) => {
        if (error) console.error("Failed to delete creators:", error.message);
      });
    logActivity(user, "creator_deleted", { count: ids.length, name: deletedNames[0] });
  }, [user]);

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
  // Large syncs (hundreds of creators across several sheet tabs) sent as
  // one giant request can time out with a generic "Failed to fetch" —
  // the connection dying before a response ever comes back, not a real
  // database rejection. Splitting into smaller chunks avoids that, and
  // means a failure partway through only affects what's left, not
  // everything that already saved successfully.
  const SAVE_CHUNK_SIZE = 40;

  const pushBaseFieldsToSupabase = useCallback(async (rows, source, commercialForKeys) => {
    const buildRow = (r) => {
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
    };

    // Rows still carrying a temporary in-memory id ("sync_..."/"imp_...")
    // are genuinely new — safe to upsert by dedupe_key. Rows with a real
    // database id already exist — those get upserted by that real id
    // instead. This split matters now that a creator can be matched by
    // link even when their phone number changed (messy sheet data) — the
    // dedupe_key string itself would differ from what's stored in that
    // case, which would otherwise make the database think it's a new row
    // instead of updating the existing one.
    const isTempId = (id) => typeof id === "string" && /^(sync|imp)_/.test(id);

    // Postgres refuses an entire upsert batch if the same conflict
    // target (id, or dedupe_key) appears more than once in it — this can
    // happen if the same creator shows up more than once across a
    // sheet's tabs, or if duplicate entries already exist in the
    // database from before link-based matching existed. Rather than
    // chase every possible upstream cause, de-duplicating right here
    // guarantees it can never reach the database that way — keeping
    // whichever occurrence came last (most recently processed).
    function dedupeBy(rowsToDedupe, keyFn) {
      const map = new Map();
      rowsToDedupe.forEach((r) => map.set(keyFn(r), r));
      return Array.from(map.values());
    }

    const newRows = dedupeBy(
      rows.filter((r) => isTempId(r.id)).map(buildRow),
      (r) => r.dedupe_key
    );
    const existingRows = dedupeBy(
      rows.filter((r) => !isTempId(r.id)).map((r) => ({ id: r.id, ...buildRow(r) })),
      (r) => r.id
    );

    async function upsertInChunks(payload, conflictTarget, label) {
      const totalBatches = Math.ceil(payload.length / SAVE_CHUNK_SIZE);
      const failures = [];
      for (let i = 0; i < payload.length; i += SAVE_CHUNK_SIZE) {
        const chunk = payload.slice(i, i + SAVE_CHUNK_SIZE);
        const batchNum = Math.floor(i / SAVE_CHUNK_SIZE) + 1;
        const { error } = await supabase
          .from("creators")
          .upsert(chunk, { onConflict: conflictTarget });
        if (error) {
          console.error(`Failed to save creators (${label}, batch ${batchNum}/${totalBatches}):`, error.message);
          // Collected, not thrown immediately — every remaining batch
          // still gets attempted, so one sync attempt surfaces every
          // real problem at once instead of just the first one hit.
          failures.push(`${label} batch ${batchNum}/${totalBatches}: ${error.message}`);
        }
      }
      return failures;
    }

    const newFailures = await upsertInChunks(newRows, "dedupe_key", "new creators");
    const existingFailures = await upsertInChunks(existingRows, "id", "existing creators");
    const allFailures = [...newFailures, ...existingFailures];

    if (allFailures.length > 0) {
      throw new Error(
        `Couldn't save everything (${allFailures.length} batch${allFailures.length === 1 ? "" : "es"} failed — ` +
          `everything else saved successfully):\n${allFailures.join("\n")}`
      );
    }
  }, []);

  // Confirms a local file upload (CSV) by actually saving it to
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
      logActivity(user, "creators_imported", { added: newRows.length, updated: existingRows.length });
    },
    [pushBaseFieldsToSupabase, loadFromSupabase, user]
  );

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
      isAdmin,
    ]
  );

  return (
    <CreatorsContext.Provider value={value}>
      {children}
    </CreatorsContext.Provider>
  );
}