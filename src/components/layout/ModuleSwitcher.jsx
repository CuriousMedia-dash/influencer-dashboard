import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";

const MODULES = [
  { key: "influencer", label: "Influencer Marketing" },
  { key: "acquisition", label: "Creator Acquisition" },
];

// Wraps the initials/avatar icon (top right) — clicking it opens a menu
// to switch between the two modules, which otherwise share no data or
// navigation with each other. The choice is remembered across visits.
export default function ModuleSwitcher({ email, avatarUrl, activeModule, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} title="Switch module" aria-label="Switch module">
        <UserAvatar email={email} avatarUrl={avatarUrl} size={48} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] overflow-hidden rounded-[10px] border shadow-[0_12px_30px_rgba(16,36,62,.15)]"
          style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
        >
          {MODULES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                onChange(m.key);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] transition-colors"
              style={{ color: "var(--ink)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--up)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {m.label}
              {activeModule === m.key && <Check size={14} style={{ color: "var(--am)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
