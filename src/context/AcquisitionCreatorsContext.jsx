import { useCallback, useEffect, useMemo, useState } from "react";
import { AcquisitionCreatorsContext } from "./acquisitionCreatorsContextDef";
import { supabase } from "../lib/supabaseClient";
import { acqCreatorFromRow, toAcqCreatorColumns } from "../utils/acquisitionCreatorRow";

const TABLE = "acquisition_creators";

export function AcquisitionCreatorsProvider({ children }) {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (err) {
      console.error("Failed to load acquisition creators:", err.message);
      setError(err.message);
    } else {
      setCreators((data || []).map(acqCreatorFromRow));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCreator = useCallback(async (fields) => {
    const { data: userData } = await supabase.auth.getUser();
    const columns = toAcqCreatorColumns(fields);
    const { data, error: err } = await supabase
      .from(TABLE)
      .insert({ ...columns, created_by: userData?.user?.id })
      .select()
      .single();
    if (err) {
      console.error("Failed to add creator:", err.message);
      throw err;
    }
    const row = acqCreatorFromRow(data);
    setCreators((prev) => [row, ...prev]);
    return row;
  }, []);

  // Optimistic single-field update — used by every inline-editable cell.
  const updateCreator = useCallback(async (id, fields) => {
    const columns = toAcqCreatorColumns(fields);
    setCreators((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));

    const { error: err } = await supabase.from(TABLE).update(columns).eq("id", id);
    if (err) {
      console.error("Failed to update creator:", err.message);
      // Roll back by re-fetching rather than guessing the prior value.
      refresh();
      throw err;
    }
  }, [refresh]);

  const deleteCreator = useCallback(async (id) => {
    setCreators((prev) => prev.filter((c) => c.id !== id));
    const { error: err } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      console.error("Failed to delete creator:", err.message);
      refresh();
      throw err;
    }
  }, [refresh]);

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelection = useCallback((ids) => setSelectedIds(new Set(ids)), []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // CSV / master-sheet import — add-or-update only, never deletes.
  // Dedupes against the currently-loaded list by email first, falling
  // back to name+profileLink when a row has no email.
  const bulkImportCreators = useCallback(async (rows) => {
    const byEmail = new Map();
    const byNameLink = new Map();
    creators.forEach((c) => {
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
      const { error: err } = await supabase.from(TABLE).insert(columns);
      if (err) {
        console.error("Bulk insert failed:", err.message);
        throw err;
      }
      insertedCount = toInsert.length;
    }

    let updatedCount = 0;
    for (const { id, fields } of toUpdate) {
      const { error: err } = await supabase.from(TABLE).update(toAcqCreatorColumns(fields)).eq("id", id);
      if (err) {
        console.error("Bulk update failed for", id, err.message);
        continue;
      }
      updatedCount += 1;
    }

    await refresh();
    return { added: insertedCount, updated: updatedCount };
  }, [creators, refresh]);

  const value = useMemo(
    () => ({
      creators,
      loading,
      error,
      refresh,
      addCreator,
      updateCreator,
      deleteCreator,
      bulkImportCreators,
      selectedIds,
      toggleSelected,
      setSelection,
      clearSelection,
    }),
    [creators, loading, error, refresh, addCreator, updateCreator, deleteCreator, bulkImportCreators, selectedIds, toggleSelected, setSelection, clearSelection]
  );

  return (
    <AcquisitionCreatorsContext.Provider value={value}>
      {children}
    </AcquisitionCreatorsContext.Provider>
  );
}
