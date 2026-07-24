import { useMemo, useState } from "react";
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
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { uniqValues } from "../utils/format";
import { NICHE_COLORS, LANG_COLORS } from "../utils/constants";

export default function CreatorsWorkspace({ activeTab, onTabChange }) {
  const { isAdmin } = useAuth();
  const [createUserOpen, setCreateUserOpen] = useState(false);
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
  const platformOptions = useMemo(() => uniqValues(creators, "platform"), [creators]);
  const genderOptions = useMemo(() => uniqValues(creators, "gender"), [creators]);

  const totalSelected = selectedIds.size;

  return (
    <div>
      <div className="mb-3 text-[13px]" style={{ color: "var(--ink2)" }}>
        <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
          {creators.filter((c) => !c.deletedAt).length}
        </b>{" "}
        total creator{creators.filter((c) => !c.deletedAt).length === 1 ? "" : "s"}
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
              e.currentTarget.style.color = "var(--ink2)";
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
              platforms={platformOptions}
              activeGenders={activeGenders}
              toggleGender={toggleGender}
              genders={genderOptions}
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
                onDeleteSelected={
                  isAdmin
                    ? () =>
                        setPendingDelete({
                          ids: Array.from(selectedIds),
                          label: `${totalSelected} selected creator${totalSelected === 1 ? "" : "s"}`,
                        })
                    : undefined
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
                isAdmin={isAdmin}
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