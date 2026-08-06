import { useCallback, useEffect, useMemo, useState } from "react";
import { AcquisitionRecordsContext } from "./acquisitionRecordsContextDef";
import { supabase } from "../lib/supabaseClient";
import { acqCreatorFromRow, toAcqCreatorColumns, MARKETING_BUDGET_FIELDS } from "../utils/acquisitionCreatorRow";
import { ACQUISITION_RESOURCES } from "../utils/acquisitionRecordsConfig";

// One CRUD instance per resource (creators / influencers) — identical
// logic, just pointed at a different table.
function useResourceCrud(table, hasMarketingBudget) {
  // Influencers has no marketing-budget columns at all — strip those
  // fields before they ever reach a column-mapping/insert/update call.
  function stripFields(fields) {
    if (hasMarketingBudget) return fields;
    const next = { ...fields };
    MARKETING_BUDGET_FIELDS.forEach((f) => delete next[f]);
    return next;
  }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from(table)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (err) {
      console.error(`Failed to load ${table}:`, err.message);
      setError(err.message);
    } else {
      setItems((data || []).map(acqCreatorFromRow));
      setError(null);
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRecord = useCallback(async (fields) => {
    const { data: userData } = await supabase.auth.getUser();
    const columns = toAcqCreatorColumns(stripFields(fields));
    const { data, error: err } = await supabase
      .from(table)
      .insert({ ...columns, created_by: userData?.user?.id })
      .select()
      .single();
    if (err) {
      console.error(`Failed to add row in ${table}:`, err.message);
      throw err;
    }
    const row = acqCreatorFromRow(data);
    setItems((prev) => [row, ...prev]);
    return row;
  }, [table]);

  const updateRecord = useCallback(async (id, fields) => {
    const columns = toAcqCreatorColumns(stripFields(fields));
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));

    const { error: err } = await supabase.from(table).update(columns).eq("id", id);
    if (err) {
      console.error(`Failed to update row in ${table}:`, err.message);
      refresh();
      throw err;
    }
  }, [table, refresh]);

  const deleteRecord = useCallback(async (id) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
    const { error: err } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      console.error(`Failed to delete row in ${table}:`, err.message);
      refresh();
      throw err;
    }
  }, [table, refresh]);

  const bulkImport = useCallback(async (rows) => {
    // Normalizes a link so http/https, www., trailing slashes, and case
    // differences between sheet tabs don't make the same channel look
    // like two different ones.
    function normalizeLink(link) {
      return String(link || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/+$/, "");
    }
    function normalizeName(name) {
      return String(name || "").trim().toLowerCase();
    }

    const byEmail = new Map();
    const byNameLink = new Map();
    const byNameEmail = new Map();
    items.forEach((c) => {
      if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
      if (normalizeLink(c.profileLink)) {
        byNameLink.set(`${normalizeName(c.name)}|${normalizeLink(c.profileLink)}`, c);
      }
      if (c.email) byNameEmail.set(`${normalizeName(c.name)}|${c.email.trim().toLowerCase()}`, c);
    });

    // Only fields that actually differ from what's already stored get
    // written — this is what keeps a repeat sync (e.g. the 5-minute
    // Google Sheet auto-sync) from hammering the database with
    // hundreds of no-op writes every time it runs.
    function diffFields(existing, incoming) {
      const changed = {};
      Object.entries(incoming).forEach(([key, val]) => {
        const current = existing[key];
        const normalizedVal = val ?? "";
        const normalizedCurrent = current ?? "";
        if (String(normalizedVal) !== String(normalizedCurrent)) changed[key] = val;
      });
      return changed;
    }

    // Dedupe WITHIN this sync batch first — the same channel can appear
    // in two different tabs (e.g. both "Podcast" and "News"), and each
    // tab is fetched independently, so without this a single sync could
    // insert two rows for one channel before cross-sync matching even
    // gets a chance to help.
    //
    // Checks BOTH a name+link key and a name+email key against the same
    // growing set (not a single derived key) — otherwise a duplicate
    // where one copy has a link and the other doesn't never actually
    // merges, since they'd land under two different keys entirely.
    const dedupedRows = [];
    const batchByNameLink = new Map();
    const batchByNameEmail = new Map();
    rows.forEach((row) => {
      const linkKey = normalizeLink(row.profileLink);
      const nameLinkKey = linkKey ? `${normalizeName(row.name)}|${linkKey}` : null;
      const nameEmailKey = row.email ? `${normalizeName(row.name)}|${row.email.trim().toLowerCase()}` : null;

      const existingIdx =
        (nameLinkKey && batchByNameLink.get(nameLinkKey)) ??
        (nameEmailKey && batchByNameEmail.get(nameEmailKey));

      if (existingIdx != null) {
        const prev = dedupedRows[existingIdx];
        dedupedRows[existingIdx] = {
          name: row.name || prev.name,
          profileLink: row.profileLink || prev.profileLink,
          email: row.email || prev.email,
          phone: row.phone || prev.phone,
          category: row.category || prev.category,
          subscribers: row.subscribers ?? prev.subscribers,
        };
        // Re-register the merged row's own keys too, in case this pass
        // filled in a link/email the earlier copy didn't have — so a
        // third duplicate later in the batch can still find it.
        const merged = dedupedRows[existingIdx];
        const mergedLinkKey = normalizeLink(merged.profileLink);
        if (mergedLinkKey) batchByNameLink.set(`${normalizeName(merged.name)}|${mergedLinkKey}`, existingIdx);
        if (merged.email) batchByNameEmail.set(`${normalizeName(merged.name)}|${merged.email.trim().toLowerCase()}`, existingIdx);
      } else {
        const newIdx = dedupedRows.length;
        dedupedRows.push(row);
        if (nameLinkKey) batchByNameLink.set(nameLinkKey, newIdx);
        if (nameEmailKey) batchByNameEmail.set(nameEmailKey, newIdx);
      }
    });

    const toInsert = [];
    const toUpdate = [];
    dedupedRows.forEach((row) => {
      const emailKey = row.email ? row.email.trim().toLowerCase() : null;
      const linkKey = normalizeLink(row.profileLink);
      const nameLinkKey = linkKey ? `${normalizeName(row.name)}|${linkKey}` : null;
      const nameEmailKey = emailKey ? `${normalizeName(row.name)}|${emailKey}` : null;
      // Prefer name+link (the strongest identity signal); fall back to
      // name+email for rows with no link on this pass (so a blank-link
      // sheet entry still merges into the same creator instead of
      // spawning a linkless duplicate); email alone as a last resort.
      const match =
        (nameLinkKey && byNameLink.get(nameLinkKey)) ||
        (nameEmailKey && byNameEmail.get(nameEmailKey)) ||
        (emailKey && byEmail.get(emailKey));
      if (match) {
        const changed = diffFields(match, row);
        if (Object.keys(changed).length > 0) toUpdate.push({ id: match.id, fields: changed });
      } else {
        toInsert.push(row);
      }
    });

    const { data: userData } = await supabase.auth.getUser();

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const columns = toInsert.map((r) => ({ ...toAcqCreatorColumns(stripFields(r)), created_by: userData?.user?.id }));
      const { error: err } = await supabase.from(table).insert(columns);
      if (err) {
        console.error(`Bulk insert failed for ${table}:`, err.message);
        throw err;
      }
      insertedCount = toInsert.length;
    }

    let updatedCount = 0;
    if (toUpdate.length > 0) {
      const results = await Promise.all(
        toUpdate.map(({ id, fields }) => supabase.from(table).update(toAcqCreatorColumns(stripFields(fields))).eq("id", id))
      );
      results.forEach((res, i) => {
        if (res.error) console.error(`Bulk update failed for ${toUpdate[i].id} in ${table}:`, res.error.message);
        else updatedCount += 1;
      });
    }

    if (insertedCount > 0 || updatedCount > 0) {
      await refresh();
    }
    return { added: insertedCount, updated: updatedCount };
  }, [items, table, refresh]);

  return useMemo(
    () => ({ items, loading, error, refresh, addRecord, updateRecord, deleteRecord, bulkImport }),
    [items, loading, error, refresh, addRecord, updateRecord, deleteRecord, bulkImport]
  );
}

export function AcquisitionRecordsProvider({ children }) {
  const creators = useResourceCrud(ACQUISITION_RESOURCES.creators.table, ACQUISITION_RESOURCES.creators.hasMarketingBudget);
  const influencers = useResourceCrud(ACQUISITION_RESOURCES.influencers.table, ACQUISITION_RESOURCES.influencers.hasMarketingBudget);

  const value = useMemo(() => ({ creators, influencers }), [creators, influencers]);

  return <AcquisitionRecordsContext.Provider value={value}>{children}</AcquisitionRecordsContext.Provider>;
}