import { useMemo, useState } from "react";
import TabBar from "../components/layout/TabBar";
import FilterSidebar from "../components/creators/FilterSidebar";
import CreatorsTable from "../components/creators/CreatorsTable";
import SelectionToolbar from "../components/creators/SelectionToolbar";
import MoveToCampaignModal from "../components/campaigns/MoveToCampaignModal";
import CampaignsTabContent from "../components/campaigns/CampaignsTabContent";
import Modal from "../components/ui/Modal";
import { useCreators } from "../hooks/useCreators";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCreatorFilters } from "../hooks/useCreatorFilters";
import { useToast } from "../hooks/useToast";
import { uniqValues } from "../utils/format";
import { NICHE_COLORS, LANG_COLORS } from "../utils/constants";

export default function CreatorsWorkspace({ activeTab, onTabChange }) {
  const {
    creators,
    selectedIds,
    toggleSelected,
    selectMany,
    clearSelection,
    updateCreatorField,
    deleteCreators,
  } = useCreators();
  const { campaigns } = useCampaigns();
  const showToast = useToast();
  const [pendingDelete, setPendingDelete] = useState(null); // { ids, label }

  const {
    search,
    setSearch,
    activeNiches,
    activeLangs,
    activePlatforms,
    activeGenders,
    activeTiers,
    toggleNiche,
    toggleLang,
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
    filtered,
  } = useCreatorFilters(creators);

  const [moveModalOpen, setMoveModalOpen] = useState(false);

  const niches = useMemo(() => uniqValues(creators, "category"), [creators]);
  const languages = useMemo(() => uniqValues(creators, "language"), [creators]);

  const totalSelected = selectedIds.size;

  return (
    <div>
      <div className="mb-3 text-[13px]" style={{ color: "var(--ink2)" }}>
        <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
          {creators.length}
        </b>{" "}
        total creator{creators.length === 1 ? "" : "s"}
      </div>

      <div className="mb-[18px] flex items-center gap-2.5">
        <div className="flex-1">
          <TabBar
            active={activeTab}
            onChange={onTabChange}
            campaignCount={campaigns.length}
          />
        </div>
      </div>

      {activeTab === "creators" ? (
        <>
          <div className="mb-2.5 flex items-baseline justify-between gap-1.5">
            <div className="text-[13px]" style={{ color: "var(--ink2)" }}>
              <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {filtered.length}
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
              activeGenders={activeGenders}
              toggleGender={toggleGender}
              activeTiers={activeTiers}
              toggleTier={toggleTier}
              activeNiches={activeNiches}
              toggleNiche={toggleNiche}
              niches={niches}
              nicheColors={NICHE_COLORS}
              activeLangs={activeLangs}
              toggleLang={toggleLang}
              languages={languages}
              langColors={LANG_COLORS}
              range={range}
              setRange={setRange}
              followerBounds={followerBounds}
              onReset={resetFilters}
            />

            <main className="min-w-0">
              <SelectionToolbar
                count={totalSelected}
                onMoveToCampaign={() => setMoveModalOpen(true)}
                onClearSelection={clearSelection}
                onDeleteSelected={() =>
                  setPendingDelete({
                    ids: Array.from(selectedIds),
                    label: `${totalSelected} selected creator${totalSelected === 1 ? "" : "s"}`,
                  })
                }
              />

              <CreatorsTable
                rows={filtered}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelected}
                onToggleSelectAll={selectMany}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={sortBy}
                onUpdateField={updateCreatorField}
                onDeleteRow={(id, name) => setPendingDelete({ ids: [id], label: name })}
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
                ? `This will permanently remove ${pendingDelete.label} from the table. This can't be undone here — if this creator came from a linked sheet, deleting the row in the sheet too keeps them from coming back on next sync.`
                : ""
            }
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingDelete) {
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