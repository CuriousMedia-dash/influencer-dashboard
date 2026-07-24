import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toHref } from "../../utils/format";

/**
 * Lets a creator have more than one live video link — each one counts
 * separately toward the Live Link Count slab, instead of only counting
 * "has at least one link" per creator.
 */
export default function MultiLinkEditor({ links, onChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const list = Array.isArray(links) ? links.filter(Boolean) : [];

  function commitAdd() {
    const val = draft.trim();
    if (val) onChange([...list, val]);
    setDraft("");
    setAdding(false);
  }

  function removeAt(index) {
    onChange(list.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-1">
      {list.map((url, i) => (
        <div key={i} className="flex items-center gap-1">
          <a
            href={toHref(url) || undefined}
            target="_blank"
            rel="noreferrer"
            title={url}
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]"
            style={{ color: "var(--am)" }}
          >
            Link {i + 1} ↗
          </a>
          <button
            type="button"
            onClick={() => removeAt(i)}
            title="Remove this link"
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--ink3)" }}
          >
            <X size={11} />
          </button>
        </div>
      ))}

      {adding ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitAdd();
            if (e.key === "Escape") { setDraft(""); setAdding(false); }
          }}
          placeholder="Paste link"
          className="w-full rounded-[6px] border px-1.5 py-0.5 text-[10px] outline-none"
          style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[10.5px]"
          style={{ color: "var(--ink3)" }}
        >
          <Plus size={11} />
          Add link
        </button>
      )}
    </div>
  );
}
