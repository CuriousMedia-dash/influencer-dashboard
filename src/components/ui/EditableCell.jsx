import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import EditPopover from "./EditPopover";
import { isUrl } from "../../utils/format";

/**
 * Editable table cell — mirrors the approved HTML's commercial/remark
 * `.edit-cell` markup: a value (link/pill/dash) + pencil button that opens
 * an inline popover.
 *
 * variant="link"   -> commercial cell (renders "Deal ↗" link if value is a URL)
 * variant="pill"   -> remark cell (renders a rounded pill if value present)
 */
export default function EditableCell({
  value,
  label,
  variant = "plain",
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const anchorRef = useRef(null);

  const hasVal = Boolean(value);
  const useTextarea = variant === "pill"; // remark uses textarea like the HTML

  function handleSave(newVal) {
    onSave(newVal);
    setEditing(false);
  }

  function handleClear() {
    onSave("");
    setEditing(false);
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {variant === "link" && hasVal && isUrl(value) ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          title={value}
          className="edit-val min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]"
          style={{ color: "var(--am)" }}
        >
          Deal ↗
        </a>
      ) : (
        <span
          title={hasVal ? value : "Click \u270e to add"}
          className="edit-val min-w-0 flex-1 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[11px]"
          style={{ color: hasVal ? "var(--ink)" : "var(--ink2)" }}
        >
          {hasVal ? (
            variant === "pill" ? (
              <span
                className="inline-block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2 py-[2px] align-middle text-[11px]"
                style={{
                  background: "rgba(30,111,224,.08)",
                  borderColor: "rgba(30,111,224,.22)",
                  color: "var(--am)",
                }}
              >
                {value}
              </span>
            ) : (
              value
            )
          ) : (
            "\u2014"
          )}
        </span>
      )}

      <button
        ref={anchorRef}
        type="button"
        title={`Edit ${label.toLowerCase()}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="edit-pencil flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border border-transparent p-0 transition-all"
        style={{ color: "var(--ink3)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--ln)";
          e.currentTarget.style.color = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.color = "var(--ink3)";
        }}
      >
        <Pencil size={11} />
      </button>

      {editing && (
        <EditPopover
          anchorRef={anchorRef}
          label={label}
          initialValue={value}
          useTextarea={useTextarea}
          onSave={handleSave}
          onClear={handleClear}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
