/**
 * Toolbar shown above the creators table once one or more rows are selected.
 * Mirrors the visual language of the HTML's `.wl-toolbar` (info text + action button).
 */
export default function SelectionToolbar({
  count,
  onMoveToCampaign,
  onClearSelection,
  onDeleteSelected,
}) {
  if (count === 0) return null;

  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="text-[13px]" style={{ color: "var(--ink2)" }}>
        <b
          style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {count}
        </b>{" "}
        creator{count === 1 ? "" : "s"} selected
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-lg border px-3 py-[7px] text-xs transition-colors"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Clear selection
        </button>
        {onDeleteSelected && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 rounded-lg border px-3.5 py-[7px] text-xs font-semibold transition-colors"
            style={{ borderColor: "rgba(224,82,75,.35)", color: "#E0524B" }}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onMoveToCampaign}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--am)" }}
        >
          Move to Campaign
        </button>
      </div>
    </div>
  );
}
