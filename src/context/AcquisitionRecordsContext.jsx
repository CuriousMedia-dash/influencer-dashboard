import { useCallback, useEffect, useMemo, useState } from "react";
import { AcquisitionRecordsContext } from "./acquisitionRecordsContextDef";
import { supabase } from "../lib/supabaseClient";
import { acqCreatorFromRow, toAcqCreatorColumns } from "../utils/acquisitionCreatorRow";
import { ACQUISITION_RESOURCES } from "../utils/acquisitionRecordsConfig";

// One CRUD instance per resource (creators / influencers) — identical
// logic, just pointed at a different table.
function useResourceCrud(table) {
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
    const columns = toAcqCreatorColumns(fields);
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
    const columns = toAcqCreatorColumns(fields);
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

    const toInsert = [];
    const toUpdate = [];
    rows.forEach((row) => {
      const emailKey = row.email ? row.email.trim().toLowerCase() : null;
      const nameLinkKey = `${row.name.trim().toLowerCase()}|${(row.profileLink || "").trim().toLowerCase()}`;
      const match = (emailKey && byEmail.get(emailKey)) || byNameLink.get(nameLinkKey);
      if (match) toUpdate.push({ id: match.id, fields: row });
      else toInsert.push(row);
    });

    const { data: userData } = await supabase.auth.getUser();

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const columns = toInsert.map((r) => ({ ...toAcqCreatorColumns(r), created_by: userData?.user?.id }));
      const { error: err } = await supabase.from(table).insert(columns);
      if (err) {
        console.error(`Bulk insert failed for ${table}:`, err.message);
        throw err;
      }
      insertedCount = toInsert.length;
    }

    let updatedCount = 0;
    for (const { id, fields } of toUpdate) {
      const { error: err } = await supabase.from(table).update(toAcqCreatorColumns(fields)).eq("id", id);
      if (err) {
        console.error(`Bulk update failed for ${id} in ${table}:`, err.message);
        continue;
      }
      updatedCount += 1;
    }

    await refresh();
    return { added: insertedCount, updated: updatedCount };
  }, [items, table, refresh]);

  return useMemo(
    () => ({ items, loading, error, refresh, addRecord, updateRecord, deleteRecord, bulkImport }),
    [items, loading, error, refresh, addRecord, updateRecord, deleteRecord, bulkImport]
  );
}

export function AcquisitionRecordsProvider({ children }) {
  const creators = useResourceCrud(ACQUISITION_RESOURCES.creators.table);
  const influencers = useResourceCrud(ACQUISITION_RESOURCES.influencers.table);

  const value = useMemo(() => ({ creators, influencers }), [creators, influencers]);

  return <AcquisitionRecordsContext.Provider value={value}>{children}</AcquisitionRecordsContext.Provider>;
}
