import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Modal from "../ui/Modal";
import { useCreators } from "../../hooks/useCreators";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "../../hooks/useToast";
import { fmt, platformNames } from "../../utils/format";

export default function AddCreatorsModal({ open, onClose, campaignId, existingCreatorIds }) {
  const { creators } = useCreators();
  const { addCreatorsToCampaign } = useCampaigns();
  const showToast = useToast();

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(() => new Set());

  const available = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return creators.filter(
      (c) =>
        !existingCreatorIds.has(c.id) &&
        (lowerSearch === "" || c.name.toLowerCase().includes(lowerSearch))
    );
  }, [creators, existingCreatorIds, search]);

  function togglePick(id) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClose() {
    setSearch("");
    setPicked(new Set());
    onClose();
  }

  function handleAdd() {
    if (picked.size === 0) return;
    addCreatorsToCampaign(campaignId, Array.from(picked));
    showToast(`${picked.size} creator(s) added`, true);
    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Creators"
      description="Search and select creators to add to this campaign."
      maxWidth={520}
    >
      <div className="relative mb-3">
        <Search
          size={14}
          className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2"
          style={{ color: "var(--ink3)" }}
        />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-lg border py-2 pl-8 pr-2.5 text-[13px] outline-none"
          style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)" }}
        />
      </div>

      <div className="mb-3 flex max-h-[300px] flex-col gap-1.5 overflow-auto">
        {available.length === 0 ? (
          <p className="py-6 text-center text-xs" style={{ color: "var(--ink3)" }}>
            No matching creators.
          </p>
        ) : (
          available.map((c) => {
            const checked = picked.has(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2 text-sm transition-colors"
                style={{
                  borderColor: checked ? "var(--am)" : "var(--ln)",
                  background: checked ? "rgba(30,111,224,.06)" : "var(--up)",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePick(c.id)}
                  className="accent-[#1E6FE0]"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" style={{ color: "var(--ink)" }}>
                    {c.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                    {platformNames(c).join(" / ") || "\u2014"} · {fmt(c.followers)} followers
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={picked.size === 0}
          className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--am)" }}
        >
          Add {picked.size > 0 ? picked.size : ""} creator
          {picked.size === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-[7px] border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
