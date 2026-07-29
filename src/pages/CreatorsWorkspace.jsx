import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import TabBar from "../components/layout/TabBar";
import FilterSidebar from "../components/creators/FilterSidebar";
import CreatorsTable from "../components/creators/CreatorsTable";
import SelectionToolbar from "../components/creators/SelectionToolbar";
import MoveToCampaignModal from "../components/campaigns/MoveToCampaignModal";
import CampaignsTabContent from "../components/campaigns/CampaignsTabContent";
import Modal from "../components/ui/Modal";
import CreateUserModal from "../components/ui/CreateUserModal";
import { useCreators } from "../hooks/useCreators";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCreatorFilters } from "../hooks/useCreatorFilters";
import { usePaginatedCreators } from "../hooks/usePaginatedCreators";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { fetchAllMatchingIds } from "../utils/creatorsQuery";
import { NICHE_COLORS, LANG_COLORS, NICHES, LANGS, PLATFORMS, GENDERS } from "../utils/constants";

export default function CreatorsWorkspace({ activeTab, onTabChange }) {
  const { isAdmin } = useAuth();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const {
    selectedIds,
    toggleSelected,
    selectMany,
    clearSelection,
    updateCreatorField,
    deleteCreators,
    cacheCreators,
    refreshSignal,
  } = useCreators();
  const { campaigns } = useCampaigns();
  const showToast = useToast();
  const [pendingDelete, setPendingDelete] = useState(null); // { ids, label }
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);

  const {
    search,
    setSearch,
    activeNiches,
    activeLangs,
    activeCities,
    activePlatforms,
    activeGenders,
    activeTiers,
    toggleNiche,
    toggleLang,
    toggleCity,
    togglePlatform,
    toggleGender,
    toggleTier,
    range,
    setRange,
    followerBounds,
    resetFilters,
    sortKey,
    sortDir,
    sortBy,
    cities,
    filterState,
  } = useCreatorFilters();

  const { rows, totalCount, loading, loadingMore, hasMore, loadMore, patchRow, removeRows } =
    usePaginatedCreators(filterState, sortKey, sortDir, refreshSignal);

  // Every page of rows the table loads also gets mirrored into the
  // shared creators cache — so if a campaign elsewhere needs to resolve
  // one of these same creators by id, it's already there without a
  // second fetch.
  useEffect(() => {
    if (rows.length) cacheCreators(rows);
  }, [rows, cacheCreators]);

  const [moveModalOpen, setMoveModalOpen] = useState(false);

  const totalSelected = selectedIds.size;

  // Applies a field edit both to Supabase (via context) and to the
  // currently-loaded page (via the pagination hook) — the latter is what
  // makes the edit show up instantly instead of waiting on the network.
  const handleUpdateField = useCallback(
    (id, field, value) => {
      patchRow(id, { [field]: value });
      updateCreatorField(id, field, value);
    },
    [patchRow, updateCreatorField]
  );

  const handleDeleteRow = useCallback((id, name) => {
    setPendingDelete({ ids: [id], label: name });
  }, []);

  const handleOpenMoveModal = useCallback(() => setMoveModalOpen(true), []);

  const handleDeleteSelected = useCallback(() => {
    setPendingDelete({
      ids: Array.from(selectedIds),
      label: `${selectedIds.size} selected creator${selectedIds.size === 1 ? "" : "s"}`,
    });
  }, [selectedIds]);

  // "Select all" in the header checkbox only ever covers rows already
  // loaded on screen — this separate action covers every creator
  // matching the current filters, including ones not loaded yet, via a
  // dedicated (lightweight, ids-only) server query.
  const handleSelectAllMatching = useCallback(async () => {
    setSelectingAllMatching(true);
    try {
      const ids = await fetchAllMatchingIds(filterState);
      selectMany(ids, true);
      showToast(`${ids.length} creators selected`, true);
    } finally {
      setSelectingAllMatching(false);
    }
  }, [filterState, selectMany, showToast]);

  const showSelectAllMatching =
    totalCount != null && totalCount > rows.length && rows.length > 0 && totalSelected < totalCount;

  return (
    <div>
      <div className="mb-3 text-[13px]" style={{ color: "var(--ink2)" }}>
        <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
          {totalCount != null ? totalCount.toLocaleString("en-US") : "\u2026"}
        </b>{" "}
        total creator{totalCount === 1 ? "" : "s"}
      </div>

      <div className="mb-[18px] flex items-center gap-2.5">
        <div className="flex-1">
          <TabBar
            active={activeTab}
            onChange={onTabChange}
            campaignCount={campaigns.length}
          />
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateUserOpen(true)}
            className="flex h-[42px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-3.5 text-[13px] font-medium shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-colors"
            style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--up)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--panel)";
              e.currentTarget.style.color = "var(--ink)";
            }}
          >
            <UserPlus size={15} />
            Create user
          </button>
        )}
      </div>

      <CreateUserModal open={createUserOpen} onClose={() => setCreateUserOpen(false)} />

      {activeTab === "creators" ? (
        <>
          <div className="mb-2.5 flex items-baseline justify-between gap-1.5">
            <div className="text-[13px]" style={{ color: "var(--ink2)" }}>
              <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {totalCount != null ? totalCount.toLocaleString("en-US") : loading ? "\u2026" : rows.length}
              </b>{" "}
              creators match
            </div>
          </div>

          <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
            <FilterSidebar
              search={search}
              setSearch={setSearch}
              activePlatforms={activePlatforms}
              togglePlatform={togglePlatform}
              platforms={PLATFORMS}
              activeGenders={activeGenders}
              toggleGender={toggleGender}
              genders={GENDERS}
              activeTiers={activeTiers}
              toggleTier={toggleTier}
              activeNiches={activeNiches}
              toggleNiche={toggleNiche}
              niches={NICHES}
              nicheColors={NICHE_COLORS}
              activeLangs={activeLangs}
              toggleLang={toggleLang}
              languages={LANGS}
              langColors={LANG_COLORS}
              activeCities={activeCities}
              toggleCity={toggleCity}
              cities={cities}
              range={range}
              setRange={setRange}
              followerBounds={followerBounds}
              onReset={resetFilters}
            />

            <main className="min-w-0">
              <SelectionToolbar
                count={totalSelected}
                onMoveToCampaign={handleOpenMoveModal}
                onClearSelection={clearSelection}
                onDeleteSelected={isAdmin ? handleDeleteSelected : undefined}
              />

              {showSelectAllMatching && (
                <div
                  className="mb-2.5 flex items-center justify-between gap-2 rounded-[9px] border px-3 py-2 text-[12px]"
                  style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
                >
                  <span>
                    {rows.length} of {totalCount.toLocaleString("en-US")} matching creators loaded.
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllMatching}
                    disabled={selectingAllMatching}
                    className="whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
                    style={{ borderColor: "var(--am)", color: "var(--am)", background: "var(--panel)" }}
                  >
                    {selectingAllMatching
                      ? "Selecting\u2026"
                      : `Select all ${totalCount.toLocaleString("en-US")} matching`}
                  </button>
                </div>
              )}

              <CreatorsTable
                rows={rows}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelected}
                onToggleSelectAll={selectMany}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={sortBy}
                onUpdateField={handleUpdateField}
                onDeleteRow={handleDeleteRow}
                isAdmin={isAdmin}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
              />
            </main>
          </div>

          <MoveToCampaignModal
            open={moveModalOpen}
            onClose={() => setMoveModalOpen(false)}
            creatorIds={Array.from(selectedIds)}
            onDone={clearSelection}
          />

          <Modal
            open={Boolean(pendingDelete)}
            onClose={() => setPendingDelete(null)}
            title="Delete creator?"
            description={
              pendingDelete
                ? `This will remove ${pendingDelete.label} from the active list. This can't be undone here — if this creator came from a linked sheet, deleting the row in the sheet too keeps them from coming back on next sync.`
                : ""
            }
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingDelete) {
                    removeRows(pendingDelete.ids);
                    deleteCreators(pendingDelete.ids);
                    showToast(
                      pendingDelete.ids.length === 1
                        ? "Creator deleted"
                        : `${pendingDelete.ids.length} creators deleted`,
                      false
                    );
                  }
                  setPendingDelete(null);
                }}
                className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white"
                style={{ background: "#E0524B" }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-[7px] border px-3.5 py-2.5 text-xs"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
              >
                Cancel
              </button>
            </div>
          </Modal>
        </>
      ) : (
        <CampaignsTabContent />
      )}
    </div>
  );
}
