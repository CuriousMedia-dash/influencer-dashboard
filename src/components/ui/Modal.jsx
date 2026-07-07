import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Generic modal overlay — mirrors the approved HTML's `.ovl` / `.spanel`
 * sheet-connect overlay styling (centered panel, dimmed backdrop).
 */
export default function Modal({ open, onClose, title, description, children, maxWidth = 440 }) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: "rgba(16,36,62,.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full rounded-[14px] border p-6 shadow-[0_12px_40px_rgba(16,36,62,.18)]"
        style={{ background: "var(--panel)", borderColor: "var(--ln)", maxWidth }}
      >
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-[var(--up)]"
            style={{ color: "var(--ink2)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {description && (
          <p
            className="mb-3.5 text-xs leading-relaxed"
            style={{ color: "var(--ink2)" }}
          >
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
