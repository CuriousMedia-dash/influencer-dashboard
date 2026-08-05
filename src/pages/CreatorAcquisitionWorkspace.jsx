import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { useAcquisitionRecords } from "../hooks/useAcquisitionRecords";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { ACQUISITION_RESOURCES } from "../utils/acquisitionRecordsConfig";
import { isClaimed, isOwner } from "../utils/acquisitionOwnership";
import { fetchCategorySheetRows } from "../utils/acquisitionCategorySheetSync";
import AcquisitionTabBar from "../components/acquisition/AcquisitionTabBar";
import AcquisitionViewToggle from "../components/acquisition/AcquisitionViewToggle";
import AcquisitionFilterSidebar from "../components/acquisition/AcquisitionFilterSidebar";
import AcquisitionCreatorsTable from "../components/acquisition/AcquisitionCreatorsTable";
import DeckEditorModal from "../components/acquisition/DeckEditorModal";

const DEFAULT_FILTERS = {
  search: "",
  subscriberRange: [0, null], // null max = no upper limit
  categories: new Set(),
  convert: "all",
  handover: "all",
};

function ResourceTabContent({ kind }) {
  const { items, loading, updateRecord, deleteRecord, refresh, bulkImport } = useAcquisitionRecords(kind);
  const { user } = useAuth();
  const showToast = useToast();
  const currentUserEmail = user?.email || "";
  const resourceConfig = ACQUISITION_RESOURCES[kind];
  const countLabel = resourceConfig.countLabel;

  // Auto-sync from the category Google Sheet — Creators only, and only
  // while this tab is actually open (no background/server job). Pulls
  // name/link/mail per category tab and leaves every other field on a
  // matched row untouched.
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  async function runSheetSync(silent) {
    setSyncing(true);
    try {
      const { rows, errors } = await fetchCategorySheetRows();
      if (rows.length > 0) {
        await bulkImport(rows);
      }
      setLastSynced(new Date());
      if (!silent) {
        showToast(
          errors.length > 0
            ? `Synced ${rows.length} rows — ${errors.length} tab(s) failed to load.`
            : `Synced ${rows.length} rows from the sheet.`,
          errors.length === 0
        );
      }
    } catch (err) {
      if (!silent) showToast(err.message || "Sheet sync failed.", false);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (kind !== "creators") return;
    runSheetSync(true); // sync on open
    const id = setInterval(() => runSheetSync(true), 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ key: "subscribers", dir: "desc" });
  const [viewMode, setViewMode] = useState("mine"); // "mine" | "fresh"
  const [mailOpen, setMailOpen] = useState(false);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function setSelection(ids) {
    setSelectedIds(new Set(ids));
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleSort(key) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const filtered = useMemo(() => {
    const [subMin, subMax] = filters.subscriberRange;
    let rows = items.filter((c) => {
      const subs = c.subscribers || 0;
      if (subs < subMin) return false;
      if (subMax != null && subs > subMax) return false;
      if (filters.categories.size > 0 && !filters.categories.has(c.category)) return false;
      if (filters.convert !== "all" && Boolean(c.convert) !== (filters.convert === "yes")) return false;
      if (filters.handover !== "all" && Boolean(c.handoverToSmm) !== (filters.handover === "yes")) return false;
      if (filters.search && !c.name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });

    if (viewMode === "fresh") {
      rows = rows.filter((c) => !isClaimed(c));
    }

    rows = [...rows].sort((a, b) => {
      if (viewMode === "mine") {
        const aMine = isOwner(a, currentUserEmail) ? 0 : 1;
        const bMine = isOwner(b, currentUserEmail) ? 0 : 1;
        if (aMine !== bMine) return aMine - bMine;
      }
      let av = a[sort.key];
      let bv = b[sort.key];
      if (sort.key === "dateOfJoining" || sort.key === "executionDate") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [items, filters, sort, viewMode, currentUserEmail]);

  const selectedRows = filtered.filter((r) => selectedIds.has(r.id));
  const selectedCategories = new Set(selectedRows.map((r) => r.category).filter(Boolean));
  const canForwardMail = selectedRows.length > 0 && selectedCategories.size <= 1;

  return (
    <>
      <div className="mb-2.5 flex items-baseline justify-between gap-1.5">
        <div className="text-[13px]" style={{ color: "var(--ink2)" }}>
          <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
            {loading ? "…" : filtered.length.toLocaleString("en-US")}
          </b>{" "}
          match
          {selectedIds.size > 0 && (
            <>
              {" · "}
              <b style={{ color: "var(--am)", fontFamily: "'JetBrains Mono', monospace" }}>{selectedIds.size}</b> selected
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {kind === "creators" && (
            <button
              type="button"
              onClick={() => runSheetSync(false)}
              disabled={syncing}
              title={lastSynced ? `Last synced ${lastSynced.toLocaleTimeString()}` : "Not synced yet this session"}
              className="flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] disabled:opacity-60"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
            >
              <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync sheet"}
            </button>
          )}
          <AcquisitionViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
        <AcquisitionFilterSidebar filters={filters} onChange={setFilters} categories={resourceConfig.categories} categoryColors={resourceConfig.categoryColors} handoverLabel={resourceConfig.handoverLabel} />

        <main className="min-w-0">
          <div className="mb-2.5 flex items-center justify-between gap-2 rounded-[9px] border px-3 py-2 text-[12px]" style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}>
            <span>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "\u00A0"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedIds.size === 0}
                className="whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)", background: "var(--panel)" }}
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!canForwardMail}
                title={selectedCategories.size > 1 ? "Select rows from a single category to forward mail" : undefined}
                onClick={() => setMailOpen(true)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                style={{ borderColor: "var(--am)", color: "var(--am)", background: "var(--panel)" }}
              >
                <Mail size={12} />
                Forward Mail
              </button>
            </div>
          </div>

          <AcquisitionCreatorsTable
            rows={filtered}
            sort={sort}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onToggleSelectAll={(checked) => setSelection(checked ? filtered.map((r) => r.id) : [])}
            onUpdate={updateRecord}
            onDelete={deleteRecord}
            currentUserEmail={currentUserEmail}
            countLabel={countLabel}
            categories={resourceConfig.categories}
            categoryColors={resourceConfig.categoryColors}
            handoverLabel={resourceConfig.handoverLabel}
            hasMarketingBudget={resourceConfig.hasMarketingBudget}
            resourceKind={kind}
          />
        </main>
      </div>

      {mailOpen && <DeckEditorModal open={mailOpen} onClose={() => setMailOpen(false)} recipients={selectedRows} categories={resourceConfig.categories} />}
    </>
  );
}

export default function CreatorAcquisitionWorkspace({ tab, onTabChange }) {
  const { items: creators } = useAcquisitionRecords("creators");
  const { items: influencers } = useAcquisitionRecords("influencers");
  const totalCount = tab === "influencers" ? influencers.length : creators.length;

  return (
    <div>
      <div className="mb-3 text-[13px]" style={{ color: "var(--ink2)" }}>
        <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
          {totalCount.toLocaleString("en-US")}
        </b>{" "}
        total {tab === "influencers" ? "influencer" : "creator"}{totalCount === 1 ? "" : "s"}
      </div>

      <div className="mb-[18px] flex items-center gap-2.5">
        <AcquisitionTabBar active={tab} onChange={onTabChange} />
      </div>

      <ResourceTabContent key={tab} kind={tab} />
    </div>
  );
}