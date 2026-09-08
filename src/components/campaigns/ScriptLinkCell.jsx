import { useRef, useState } from "react";
import { FileText, Check, X } from "lucide-react";
import { toHref } from "../../utils/format";

/**
 * One script link per influencer, per campaign. Shows as an "Open" chip
 * once a link is saved, and as a quiet "Add script" prompt when it isn't.
 * Both sides of the app use this — pass readOnly for a view where the
 * link should only be openable, not changeable.
 */
export default function ScriptLinkCell({ value, onChange, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  const href = toHref(value);

  function startEditing() {
    if (readOnly) return;
    setDraft(value || "");
    setEditing(true);
  }

  function save() {
    const next = draft.trim();
    setEditing(false);
    if (next !== (value || "")) onChange(next);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="Paste doc link"
          className="min-w-0 flex-1 rounded-[6px] border px-1.5 py-1 text-[11px] outline-none"
          style={{ borderColor: "var(--am)", background: "var(--panel)", color: "var(--ink)" }}
        />
        <button
          type="button"
          onClick={save}
          title="Save"
          className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[5px]"
          style={{ color: "#2BAE66" }}
        >
          <Check size={13} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          title="Cancel"
          className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[5px]"
          style={{ color: "var(--ink3)" }}
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  if (!value) {
    return readOnly ? (
      <span className="text-[11px]" style={{ color: "var(--ink3)" }}>
        {"\u2014"}
      </span>
    ) : (
      <button
        type="button"
        onClick={startEditing}
        className="rounded-[6px] border border-dashed px-2 py-1 text-[11px]"
        style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}
      >
        + Add script
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title={value}
          className="flex min-w-0 items-center gap-1 truncate rounded-full border px-2 py-1 text-[11px] hover:underline"
          style={{ borderColor: "rgba(30,111,224,.35)", background: "rgba(30,111,224,.07)", color: "var(--am)" }}
        >
          <FileText size={11} className="flex-shrink-0" />
          Open script
        </a>
      ) : (
        // Saved but not a usable URL — show the raw text rather than a
        // link that would go nowhere.
        <span className="min-w-0 truncate text-[11px]" title={value} style={{ color: "var(--ink2)" }}>
          {value}
        </span>
      )}
      {!readOnly && (
        <button
          type="button"
          onClick={startEditing}
          title="Change script link"
          className="flex-shrink-0 text-[10px] underline"
          style={{ color: "var(--ink3)" }}
        >
          edit
        </button>
      )}
    </div>
  );
}
