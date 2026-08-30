import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { CreatorsContext } from "./creatorsContextDef";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { dedupeKey, syncCreators, parseCsvImport } from "../utils/csvImport";
import { logActivity } from "../utils/activityLog";
import {
  syncFromSheetUrl,
  fetchSheetAllTabsCsv,
  fetchSheetCsv,
  isGoogleSheetsShareUrl,
  normaliseSheetUrl,
} from "../utils/sheetSync";
import { creatorFromRow, toCreatorColumns } from "../utils/creatorRow";

const MASTER_SHEET_KEY = "master_sheet";

// The linked master sheet re-syncs itself once every morning at this
// hour (local time, 24h clock). Change this one number to move it.
const AUTO_SYNC_HOUR = 7;

// Local calendar day as "YYYY-MM-DD" — used to remember which morning
// the auto-sync last ran, so it runs once a day and not once an hour.
function todayKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Only these base fields (never remark/quit/commercial — the fields
// edited inside the app) get pushed during a sheet sync, so a sync never
// overwrites something someone typed in the CRM itself.
const SHEET_SYNCED_FIELDS = [
  "name", "phone", "email", "platform", "profileLink",
  "followers", "gender", "category", "language", "city", "tier",
];

// Columns read back for the rows a sync/import is about to touch. This
// is every field a sheet sync can write, so the sync can compare what's
// already saved against what the sheet says and skip re-saving rows that
// haven't actually changed — the difference between rewriting the whole
// table every morning and writing only the handful of rows that moved.
const EXISTING_LOOKUP_COLUMNS =
  "id, dedupe_key, name, phone, email, platform, profile_link, followers, gender, category, language, city, tier";

// Treats blank, null and undefined as the same thing (the database
// stores "" as null), and compares numbers as numbers so 5000 and
// "5000" don't look like a change.
function sameFieldValue(a, b) {
  const aEmpty = a == null || a === "";
  const bEmpty = b == null || b === "";
  if (aEmpty || bEmpty) return aEmpty && bEmpty;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a).trim() === String(b).trim();
}

// Narrows a merged result down to just the rows worth writing: brand new
// creators, plus existing ones where at least one sheet-synced field
// genuinely differs from what's already in the database. Without a
// `before` snapshot (mirror mode, which reads a different, lighter set of
// columns) everything is written, same as before.
function rowsNeedingSave(merged, existingById) {
  if (!existingById) return merged;
  return merged.filter((row) => {
    const before = existingById.get(row.id);
    if (!before) return true; // new creator
    return SHEET_SYNCED_FIELDS.some((f) => !sameFieldValue(before[f], row[f]));
  });
}

// Chunk size for any `.in("dedupe_key"/"id", [...])` lookup — keeps a
// single request's URL/payload reasonable no matter how large a CSV or
// sheet import is.
const LOOKUP_CHUNK_SIZE = 300;

export function CreatorsProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const showToast = useToast();

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // A lightweight, on-demand cache of individual creators, keyed by id —
  // NOT the whole table. Populated by whichever pages of the (now
  // paginated) Creators table have loaded so far, plus by
  // ensureCreatorsLoaded() below for campaign pages that need to resolve
  // a creator by id that may not be on a currently-loaded page.
  const [creatorsCache, setCreatorsCache] = useState(() => new Map());
  const cacheCreators = useCallback((rows) => {
    if (!rows || rows.length === 0) return;
    setCreatorsCache((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => next.set(r.id, r));
      return next;
    });
  }, []);

  const getCreatorById = useCallback((id) => creatorsCache.get(id), [creatorsCache]);

  // Fetches any of the given ids that aren't already cached. Used by
  // campaign pages: a campaign can reference a creator who isn't on the
  // currently-loaded page of the main Creators table, so their name/data
  // has to be fetched on demand instead of assumed to already be in
  // memory.
  const ensureCreatorsLoaded = useCallback(
    async (ids) => {
      const missing = Array.from(new Set(ids)).filter((id) => id && !creatorsCache.has(id));
      if (missing.length === 0) return;
      const fetched = [];
      for (let i = 0; i < missing.length; i += LOOKUP_CHUNK_SIZE) {
        const chunk = missing.slice(i, i + LOOKUP_CHUNK_SIZE);
        const { data, error } = await supabase.from("creators").select("*").in("id", chunk);
        if (error) {
          console.error("Failed to load creators for campaign:", error.message);
          continue;
        }
        (data || []).forEach((row) => fetched.push(creatorFromRow(row)));
      }
      cacheCreators(fetched);
    },
    [creatorsCache, cacheCreators]
  );

  // Bumped after anything that changes which rows exist (CSV import,
  // sheet sync, etc.) — usePaginatedCreators watches this and reloads
  // from the top when it changes, since there's no full local list here
  // to just update in place anymore.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const bumpRefreshSignal = useCallback(() => setRefreshSignal((n) => n + 1), []);

  const [sheetLink, setSheetLink] = useState(null);
  const [syncStatus, setSyncStatus] = useState("not_connected");
  const [syncError, setSyncError] = useState("");
  const [importStatus, setImportStatus] = useState("idle");
  const [importError, setImportError] = useState("");
  const syncingRef = useRef(false);

  // Mirrors `sheetLink` for use inside timers and intervals, which would
  // otherwise keep reading whatever value existed when they were set up.
  const sheetLinkRef = useRef(null);
  useEffect(() => {
    sheetLinkRef.current = sheetLink;
  }, [sheetLink]);

  // The linked sheet is stored in app_settings (one record, shared by the
  // whole team) — but nothing ever read it back when the app loaded, so
  // the link looked like it had disappeared after every refresh and had
  // to be pasted again. This loads it once the user is known, which is
  // what makes it stick.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", MASTER_SHEET_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const record = data?.value;
        if (!record?.url) return;
        setSheetLink(record);
        sheetLinkRef.current = record;
        setSyncStatus(record.lastSyncedAt ? "synced" : "idle");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  // Writes one field to Supabase and keeps the shared cache in sync —
  // the actual table's own local row state (for the row the user is
  // looking at) is updated separately by the caller via
  // usePaginatedCreators's patchRow, so the edit shows up instantly
  // without waiting on this network round trip.
  const updateCreatorField = useCallback(
    (id, field, value) => {
      const cached = creatorsCache.get(id);
      if (cached) cacheCreators([{ ...cached, [field]: value }]);
      const col = toCreatorColumns({ [field]: value });
      supabase
        .from("creators")
        .update(col)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to save creator change:", error.message);
        });
    },
    [creatorsCache, cacheCreators]
  );

  // "Deleting" a creator only marks when it happened — the row itself,
  // and every campaign they were ever part of, stays intact. They're
  // just marked out of the active All Creators list from here on.
  const deleteCreators = useCallback(
    (ids) => {
      const idSet = new Set(ids);
      const now = new Date().toISOString();
      const deletedNames = ids
        .map((id) => creatorsCache.get(id)?.name)
        .filter(Boolean);
      setCreatorsCache((prev) => {
        const next = new Map(prev);
        idSet.forEach((id) => {
          const c = next.get(id);
          if (c) next.set(id, { ...c, deletedAt: now });
        });
        return next;
      });
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
    },
    [user, creatorsCache]
  );

  // Large syncs (hundreds of creators across several sheet tabs, or a
  // big CSV) sent as one giant request can time out with a generic
  // "Failed to fetch" — the connection dying before a response ever
  // comes back, not a real database rejection. Splitting into smaller
  // chunks avoids that, and means a failure partway through only affects
  // what's left, not everything that already saved successfully.
  const SAVE_CHUNK_SIZE = 40;

  const pushBaseFieldsToSupabase = useCallback(async (rows, source, commercialForKeys) => {
    const buildRow = (r) => {
      const key = dedupeKey(r);
      const fields = commercialForKeys?.has(key)
        ? [...SHEET_SYNCED_FIELDS, "commercial"]
        : SHEET_SYNCED_FIELDS;
      const cols = toCreatorColumns(Object.fromEntries(fields.map((k) => [k, r[k]])));
      const row = { ...cols, dedupe_key: key };
      if (source) row.source = source;
      return row;
    };

    const isTempId = (id) => typeof id === "string" && /^(sync|imp)_/.test(id);

    function dedupeBy(rowsToDedupe, keyFn) {
      const map = new Map();
      rowsToDedupe.forEach((r) => map.set(keyFn(r), r));
      return Array.from(map.values());
    }

    const newRows = dedupeBy(rows.filter((r) => isTempId(r.id)).map(buildRow), (r) => r.dedupe_key);
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
        const { error } = await supabase.from("creators").upsert(chunk, { onConflict: conflictTarget });
        if (error) {
          console.error(`Failed to save creators (${label}, batch ${batchNum}/${totalBatches}):`, error.message);
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

  // Looks up, by dedupe_key, which of the given rows already exist in
  // the database — scales with the size of the CSV/sheet being
  // imported, never with the total size of the creators table, since it
  // only ever queries for the specific keys present in `rows`.
  const fetchExistingByDedupeKeys = useCallback(async (rows) => {
    const keys = Array.from(new Set(rows.map(dedupeKey)));
    const existingMap = new Map(); // dedupe_key -> current values for that creator
    for (let i = 0; i < keys.length; i += LOOKUP_CHUNK_SIZE) {
      const chunk = keys.slice(i, i + LOOKUP_CHUNK_SIZE);
      const { data, error } = await supabase
        .from("creators")
        .select(EXISTING_LOOKUP_COLUMNS)
        .in("dedupe_key", chunk);
      if (error) {
        console.error("Failed to check for existing creators:", error.message);
        continue;
      }
      (data || []).forEach((row) => {
        existingMap.set(row.dedupe_key, {
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
          city: row.city || "",
          tier: row.tier || "",
        });
      });
    }
    return existingMap;
  }, []);

  // Builds the "N will be added, M will be updated" preview for a parsed
  // CSV, purely from a DB lookup of the CSV's own dedupe keys — never
  // needs the full creators table in memory, so this stays fast no
  // matter how large the table grows.
  const previewCsvImport = useCallback(
    async (rows) => {
      const existingMap = await fetchExistingByDedupeKeys(rows);
      const addedKeys = [];
      let added = 0;
      let updated = 0;
      const merged = rows.map((row) => {
        const key = dedupeKey(row);
        const match = existingMap.get(key);
        if (match) {
          updated++;
          return { ...row, id: match.id };
        }
        added++;
        addedKeys.push(key);
        return { ...row, id: `imp_${Date.now()}_${added}` };
      });
      return { merged, added, updated, addedKeys };
    },
    [fetchExistingByDedupeKeys]
  );

  // Confirms a local file upload (CSV) by actually saving it to
  // Supabase — the base fields only, same as a sheet sync would, so any
  // in-app edits (remark/quit/commercial) on existing creators are left
  // alone.
  const confirmLocalImport = useCallback(
    async (mergedRows, { addedKeys = [] } = {}) => {
      const addedKeySet = new Set(addedKeys);
      const newRows = mergedRows.filter((r) => addedKeySet.has(dedupeKey(r)));
      const existingRows = mergedRows.filter((r) => !addedKeySet.has(dedupeKey(r)));

      if (newRows.length > 0) await pushBaseFieldsToSupabase(newRows, "upload", addedKeySet);
      if (existingRows.length > 0) await pushBaseFieldsToSupabase(existingRows);

      bumpRefreshSignal();
      logActivity(user, "creators_imported", { added: newRows.length, updated: existingRows.length });
    },
    [pushBaseFieldsToSupabase, bumpRefreshSignal, user]
  );

  // Admin-only Google Sheet sync. Matching against existing creators is
  // done via a DB dedupe-key lookup scoped to just the sheet's own rows
  // (same approach as CSV import) — EXCEPT in mirror mode, which by
  // definition needs to see every currently sheet-sourced creator (not
  // just ones the new sheet data happens to match) in order to detect
  // which ones are no longer in the sheet at all. That one path scales
  // with "how many sheet-sourced creators exist," not with the total
  // creators table — worth knowing if the linked sheet itself is ever
  // expected to grow into the tens of thousands.
  const fetchAllSheetSourced = useCallback(async () => {
    const out = [];
    let offset = 0;
    const CHUNK = 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from("creators")
        .select("id, profile_link, platform")
        .eq("source", "sheet")
        .range(offset, offset + CHUNK - 1);
      if (error) {
        console.error("Failed to load sheet-sourced creators:", error.message);
        break;
      }
      (data || []).forEach((row) => out.push({ id: row.id, profileLink: row.profile_link, platform: row.platform }));
      if (!data || data.length < CHUNK) break;
      offset += CHUNK;
    }
    return out;
  }, []);

  const syncNow = useCallback(
    async (rawUrl, { mirror = false, auto = false } = {}) => {
      if (!isAdmin) return;
      setSyncStatus("syncing");
      try {
        const beforeSync = mirror
          ? await fetchAllSheetSourced()
          : []; // populated per-row below for non-mirror via existingMap

        // For non-mirror syncs, the caller only needs to know about
        // creators that could plausibly match one of the incoming rows —
        // syncFromSheetUrl/syncCreators only uses `existing` to build a
        // link-match index, so a targeted subset behaves identically to
        // passing the whole table, without ever loading it.
        const result = mirror
          ? await syncFromSheetUrl(rawUrl, beforeSync, { mirror: true })
          : await (async () => {
              // Peek at the sheet rows first so we know which dedupe keys
              // to look up — syncFromSheetUrl already does its own fetch
              // internally, so this fetches the sheet's CSV rows here
              // too and passes a pre-matched `existing` subset in.
              let rows = [];
              if (isGoogleSheetsShareUrl(rawUrl)) {
                const tabs = await fetchSheetAllTabsCsv(rawUrl);
                tabs.forEach(({ csv }) => rows.push(...parseCsvImport(csv).rows));
              } else {
                const text = await fetchSheetCsv(normaliseSheetUrl(rawUrl));
                rows = parseCsvImport(text).rows;
              }
              const existingMap = await fetchExistingByDedupeKeys(rows);
              const existingSubset = Array.from(existingMap.values());
              const { merged, added, updated, addedKeys } = syncCreators(existingSubset, rows, { mirror: false });
              // Snapshot of what these creators looked like before the
              // merge, so only genuinely changed rows get written.
              const existingById = new Map(existingSubset.map((c) => [c.id, c]));
              return { merged, added, updated, removed: 0, addedKeys, rowErrors: [], existingById };
            })();

        const { merged, added, updated, removed, addedKeys } = result;

        // The sheet is mostly the same 3,000-odd rows every single day.
        // Writing all of them back each time is what made a sync slow and
        // heavy; this saves only the rows whose values actually differ.
        const toSave = rowsNeedingSave(merged, result.existingById);
        if (toSave.length > 0) {
          await pushBaseFieldsToSupabase(toSave, "sheet", new Set(addedKeys));
        }
        let somethingChanged = toSave.length > 0;

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
            } else {
              somethingChanged = true;
            }
          }
        }

        // Reloading the creators table throws whoever's using it back to
        // the top, so it only happens when the sync actually changed
        // something. A morning sync that finds nothing new leaves the
        // screen exactly as it was.
        if (somethingChanged) bumpRefreshSignal();

        const record = {
          url: rawUrl,
          lastSyncedAt: new Date().toISOString(),
          mirror,
          // Which morning the auto-sync last ran. A manual sync must not
          // wipe this, or the 7 AM sync would fire again the same day.
          autoSyncedOn: auto ? todayKey() : sheetLinkRef.current?.autoSyncedOn ?? null,
        };
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
        logActivity(user, "sheet_synced", {
          added,
          duplicates: updated,
          changed: toSave.length,
          removed: mirror ? removed : 0,
          auto,
        });
        // What the merge internally calls an "updated" row is a sheet row
        // that already exists in the portal — reported to the team as a
        // duplicate, which is the word everyone actually uses for it.
        return { added, duplicates: updated, changed: toSave.length, removed, rowErrors: result.rowErrors || [] };
      } catch (err) {
        setSyncStatus("error");
        setSyncError(err?.message || "Something went wrong while syncing.");
        throw err;
      }
    },
    [isAdmin, pushBaseFieldsToSupabase, bumpRefreshSignal, user, fetchAllSheetSourced, fetchExistingByDedupeKeys]
  );

  // ── Daily 7 AM sheet sync ──────────────────────────────────────────
  // This runs in the browser, not on a server: from 7 AM local time
  // onward, the first admin tab that's open that day runs the sync once
  // and stamps the date on the shared app_settings record, so no one
  // else's tab repeats it. If nobody has the portal open at 7, it
  // catches up the moment an admin opens it later that morning.
  const runDailyAutoSync = useCallback(async () => {
    if (!isAdmin || syncingRef.current) return;
    const now = new Date();
    if (now.getHours() < AUTO_SYNC_HOUR) return;

    syncingRef.current = true;
    try {
      // Re-read the shared record instead of trusting local state, which
      // may be hours old or already claimed by another admin's tab.
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", MASTER_SHEET_KEY)
        .maybeSingle();
      if (error) return;

      const current = data?.value;
      if (!current?.url) return;
      setSheetLink(current);
      sheetLinkRef.current = current;

      const today = todayKey(now);
      if (current.autoSyncedOn === today) return;

      // Claim the morning first, so another tab checking at the same
      // moment sees it as taken rather than syncing a second time.
      const claimed = { ...current, autoSyncedOn: today };
      const { error: claimError } = await supabase
        .from("app_settings")
        .upsert({ key: MASTER_SHEET_KEY, value: claimed, updated_by: user?.id }, { onConflict: "key" });
      if (claimError) return;
      setSheetLink(claimed);
      sheetLinkRef.current = claimed;

      const result = await syncNow(current.url, { mirror: Boolean(current.mirror), auto: true });
      if (!result) return;
      showToast(
        `Morning sync: ${result.added} added, ${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"}` +
          (current.mirror ? `, ${result.removed} removed` : ""),
        true
      );
    } catch (err) {
      console.error("Morning sheet sync failed:", err?.message || err);
    } finally {
      syncingRef.current = false;
    }
  }, [isAdmin, user, syncNow, showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    // Deferred by a tick rather than run inline, so the first check
    // happens after this render commits instead of during it.
    const kickoff = setTimeout(runDailyAutoSync, 0);
    // Checked every minute so a tab left open overnight syncs at 7 on its
    // own; the focus/visibility listeners cover a laptop waking from
    // sleep, where timers can be badly delayed.
    const timer = setInterval(runDailyAutoSync, 60 * 1000);
    const onWake = () => {
      if (document.visibilityState === "visible") runDailyAutoSync();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [isAdmin, runDailyAutoSync]);

  const importFromSheet = useCallback(
    async (rawUrl) => {
      setImportStatus("importing");
      setImportError("");
      try {
        let rows = [];
        if (isGoogleSheetsShareUrl(rawUrl)) {
          const tabs = await fetchSheetAllTabsCsv(rawUrl);
          tabs.forEach(({ csv }) => rows.push(...parseCsvImport(csv).rows));
        } else {
          const text = await fetchSheetCsv(normaliseSheetUrl(rawUrl));
          rows = parseCsvImport(text).rows;
        }
        const existingMap = await fetchExistingByDedupeKeys(rows);
        const existingSubset = Array.from(existingMap.values());
        const { merged, added, updated, addedKeys } = syncCreators(existingSubset, rows, { mirror: false });
        await pushBaseFieldsToSupabase(merged, "sheet", new Set(addedKeys));
        bumpRefreshSignal();
        setImportStatus("done");
        return { added, updated, rowErrors: [] };
      } catch (err) {
        setImportStatus("error");
        setImportError(err?.message || "Something went wrong while importing.");
        throw err;
      }
    },
    [pushBaseFieldsToSupabase, bumpRefreshSignal, fetchExistingByDedupeKeys]
  );

  const unlinkSheet = useCallback(async () => {
    if (!isAdmin) return;
    const { error } = await supabase.from("app_settings").delete().eq("key", MASTER_SHEET_KEY);
    if (error) {
      console.error("Failed to unlink master sheet:", error.message);
      return;
    }
    setSheetLink(null);
    setSyncStatus("not_connected");
  }, [isAdmin]);

  const setSheetMirror = useCallback(
    async (mirror) => {
      if (!isAdmin || !sheetLink?.url) return;
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
    [isAdmin, sheetLink, user]
  );

  const value = useMemo(
    () => ({
      cacheCreators,
      getCreatorById,
      ensureCreatorsLoaded,
      refreshSignal,
      bumpRefreshSignal,
      updateCreatorField,
      deleteCreators,
      confirmLocalImport,
      previewCsvImport,
      selectedIds,
      toggleSelected,
      selectMany,
      clearSelection,
      isAdmin,
      sheetLink,
      syncStatus,
      syncError,
      syncNow,
      unlinkSheet,
      setSheetMirror,
      importFromSheet,
      importStatus,
      importError,
    }),
    [
      cacheCreators,
      getCreatorById,
      ensureCreatorsLoaded,
      refreshSignal,
      bumpRefreshSignal,
      updateCreatorField,
      deleteCreators,
      confirmLocalImport,
      previewCsvImport,
      selectedIds,
      toggleSelected,
      selectMany,
      clearSelection,
      isAdmin,
      sheetLink,
      syncStatus,
      syncError,
      syncNow,
      unlinkSheet,
      setSheetMirror,
      importFromSheet,
      importStatus,
      importError,
    ]
  );

  return <CreatorsContext.Provider value={value}>{children}</CreatorsContext.Provider>;
}
