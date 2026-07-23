import { useEffect, useState } from "react";
import { Sun, Moon, LogOut, UserPlus } from "lucide-react";
import { useCreators } from "../../hooks/useCreators";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { timeAgo } from "../../utils/format";
import InviteBrandModal from "../ui/InviteBrandModal";

function statusPillProps(syncStatus, lastSyncedAt) {
  switch (syncStatus) {
    case "syncing":
      return { color: "#E0A62B", label: "Syncing…" };
    case "synced":
      return {
        color: "#2BAE66",
        label: lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : "Synced",
      };
    case "error":
      return { color: "#E0524B", label: "Sync error — click gear to retry" };
    case "not_connected":
    default:
      return { color: "var(--ink3)", label: "No sheet linked" };
  }
}

export default function Header({ onGearClick }) {
  const { syncStatus, sheetLink } = useCreators();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  // Re-render every 30s so "Synced N minutes ago" stays roughly current.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const { color, label } = statusPillProps(syncStatus, sheetLink?.lastSyncedAt);

  return (
    <header
      className="border-b px-8 py-6"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div
            className="flex items-center gap-2 uppercase tracking-[0.13em] text-[11px] mb-[5px]"
            style={{
              color: "var(--ink3)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span className="pulse-dot" />
            INFLUENCER DASHBOARD
          </div>

          <h1
            className="text-[30px] font-semibold"
            style={{
              fontFamily: "Fraunces, serif",
              color: "var(--ink)",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Curious <span style={{ color: "var(--am)" }}>Media </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div
            title={sheetLink?.url || "No Google Sheet linked yet — click the gear to connect one"}
            className="flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[11px] shadow-[0_1px_2px_rgba(16,36,62,.04)]"
            style={{
              borderColor: "var(--ln)",
              background: "var(--panel)",
              color: "var(--ink2)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span
              className={"h-1.5 w-1.5 rounded-full" + (syncStatus === "syncing" ? " animate-pulse" : "")}
              style={{ background: color }}
            />
            {label}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle dark/light mode"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border text-[15px] shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-colors"
            style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--up)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--panel)";
              e.currentTarget.style.color = "var(--ink2)";
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            onClick={onGearClick}
            title="Import creators / manage linked Google Sheet"
            aria-label="Import creators / manage linked Google Sheet"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border text-[15px] shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-colors"
            style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--up)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--panel)";
              e.currentTarget.style.color = "var(--ink2)";
            }}
          >
            ⚙
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              title="Invite a brand contact"
              aria-label="Invite a brand contact"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border text-[15px] shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-colors"
              style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--up)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--panel)";
                e.currentTarget.style.color = "var(--ink2)";
              }}
            >
              <UserPlus size={15} />
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={signOut}
              title={`Signed in as ${user.email} — click to sign out`}
              aria-label="Sign out"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border text-[15px] shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-colors"
              style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "var(--ink2)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--up)";
                e.currentTarget.style.color = "#E0524B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--panel)";
                e.currentTarget.style.color = "var(--ink2)";
              }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
      <InviteBrandModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </header>
  );
}