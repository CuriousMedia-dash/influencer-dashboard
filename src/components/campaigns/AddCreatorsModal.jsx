import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Modal from "../ui/Modal";
import { supabase } from "../../lib/supabaseClient";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "../../hooks/useToast";
import { fmt, platformNames } from "../../utils/format";
import { creatorFromRow } from "../../utils/creatorRow";

const RESULT_LIMIT = 30;

export default function AddCreatorsModal({ open, onClose, campaignId, existingCreatorIds }) {
  const { addCreatorsToCampaign } = useCampaigns();
  const showToast = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(() => new Set());

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(handle);
  }, [search]);

  // Live search against the database instead of filtering a full local
  // list — there's no longer a full creators list held in memory to
  // filter. Requires at least 2 characters so opening the modal (or
  // clearing the box) doesn't fire off a "match everything" query
  // against a 50,000+ row table.
  useEffect(() => {
    if (!open) return;
    if (debouncedSearch.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const escaped = debouncedSearch.replace(/[%_]/g, (m) => `\\${m}`);
    supabase
      .from("creators")
      .select("*")
      .is("deleted_at", null)
      .ilike("name", `%${escaped}%`)
      .order("followers", { ascending: false })
      .limit(RESULT_LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to search creators:", error.message);
          setResults([]);
        } else {
          setResults((data || []).map(creatorFromRow));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  const available = useMemo(
    () => results.filter((c) => !existingCreatorIds.has(c.id)),
    [results, existingCreatorIds]
  );

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
    setDebouncedSearch("");
    setResults([]);
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
      description="Search by name to find creators to add to this campaign."
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
          placeholder="Search by name… (min 2 characters)"
          className="w-full rounded-lg border py-2 pl-8 pr-2.5 text-[13px] outline-none"
          style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)" }}
        />
      </div>

      <div className="mb-3 flex max-h-[300px] flex-col gap-1.5 overflow-auto">
        {debouncedSearch.length < 2 ? (
          <p className="py-6 text-center text-xs" style={{ color: "var(--ink3)" }}>
            Type at least 2 characters to search.
          </p>
        ) : loading ? (
          <p className="py-6 text-center text-xs" style={{ color: "var(--ink3)" }}>
            Searching…
          </p>
        ) : available.length === 0 ? (
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
