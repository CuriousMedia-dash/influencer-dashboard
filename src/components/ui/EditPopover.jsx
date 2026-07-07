import { useEffect, useRef, useState } from "react";

/**
 * Inline edit popover — mirrors the approved HTML's `.ep` panel.
 * Positions itself near the anchor element (the pencil button that opened it),
 * just like the original `openEdit()` logic.
 */
export default function EditPopover({
  anchorRef,
  label,
  initialValue,
  useTextarea,
  onSave,
  onClear,
  onCancel,
}) {
  const [value, setValue] = useState(initialValue || "");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const pw = 260;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    if (top + 160 > window.innerHeight) top = rect.top - 166;
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onCancel();
    }
    function handleClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest(".edit-pencil") &&
        !e.target.closest(".edit-val")
      ) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [onCancel]);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[260px] rounded-[10px] border p-3 shadow-[0_8px_32px_rgba(16,36,62,.18)]"
      style={{
        top: pos.top,
        left: pos.left,
        background: "var(--panel)",
        borderColor: "var(--ln)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4
        className="mb-2 text-xs font-semibold"
        style={{ color: "var(--ink)" }}
      >
        Edit {label}
      </h4>

      {useTextarea ? (
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}\u2026`}
          className="h-[60px] w-full resize-none rounded-[7px] border px-[9px] py-[7px] text-xs outline-none"
          style={{
            background: "var(--up)",
            borderColor: "var(--ln)",
            color: "var(--ink)",
            fontFamily: "Inter, sans-serif",
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = "var(--am)")
          }
          onBlur={(e) => (e.target.style.borderColor = "var(--ln)")}
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            label === "Commercial" ? "Paste URL or text\u2026" : "Add note\u2026"
          }
          className="w-full rounded-[7px] border px-[9px] py-[7px] text-xs outline-none"
          style={{
            background: "var(--up)",
            borderColor: "var(--ln)",
            color: "var(--ink)",
            fontFamily: "Inter, sans-serif",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--am)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--ln)")}
        />
      )}

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onSave(value.trim())}
          className="flex-1 rounded-[7px] py-[7px] text-xs font-semibold text-white"
          style={{ background: "var(--am)" }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-[7px] border px-2.5 py-[7px] text-xs"
          style={{ borderColor: "rgba(224,82,75,.3)", color: "#E0524B" }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[7px] border px-2.5 py-[7px] text-xs"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
