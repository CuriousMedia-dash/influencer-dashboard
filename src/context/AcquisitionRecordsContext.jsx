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
    const byEmail = new Map();
    const byNameLink = new Map();
    items.forEach((c) => {
      if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
      byNameLink.set(`${c.name.trim().toLowerCase()}|${c.profileLink.trim().toLowerCase()}`, c);
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

    const toInsert = [];
    const toUpdate = [];
    rows.forEach((row) => {
      const emailKey = row.email ? row.email.trim().toLowerCase() : null;
      const nameLinkKey = `${row.name.trim().toLowerCase()}|${(row.profileLink || "").trim().toLowerCase()}`;
      const match = (emailKey && byEmail.get(emailKey)) || byNameLink.get(nameLinkKey);
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