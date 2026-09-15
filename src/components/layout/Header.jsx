import { useState } from "react";
import { Sun, Moon, LogOut, UserPlus, ScrollText, Upload } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { useCreators } from "../../hooks/useCreators";
import { timeAgo } from "../../utils/format";
import InviteBrandModal from "../ui/InviteBrandModal";
import ModuleSwitcher from "./ModuleSwitcher";
import ActivityLogModal from "../ui/ActivityLogModal";

function statusDotColor(syncStatus) {
  return syncStatus === "synced" ? "#2BAE66" : "var(--ink3)";
}

export default function Header({ onGearClick, onAcquisitionUploadClick, activeModule, onModuleChange }) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const { syncStatus, sheetLink } = useCreators();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);

  // The sheet-sync dot, CSV/Sheet upload icon, brand invite, and activity
  // log are all Influencer Marketing features — Creator Acquisition is a
  // separate, non-interconnected module and doesn't show any of them.
  const isInfluencerModule = activeModule !== "acquisition";

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
            {activeModule === "acquisition" ? "CREATOR ACQUISITION" : "INFLUENCER DASHBOARD"}
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

        <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          {isInfluencerModule && isAdmin && (
            <div
              title={
                sheetLink?.url
                  ? `${sheetLink.url}${syncStatus === "synced" && sheetLink.lastSyncedAt ? " — synced " + timeAgo(sheetLink.lastSyncedAt) : ""}`
                  : "No Google Sheet linked yet — click the gear to connect one"
              }
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full border shadow-[0_1px_2px_rgba(16,36,62,.04)]"
              style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
            >
              <span
                className={"h-2 w-2 rounded-full" + (syncStatus === "syncing" ? " animate-pulse" : "")}
                style={{ background: statusDotColor(syncStatus) }}
              />
            </div>
          )}
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

          {isInfluencerModule && (
            <button
              type="button"
              onClick={onGearClick}
              title={isAdmin ? "Import creators / manage linked Google Sheet" : "Upload creators (CSV)"}
              aria-label={isAdmin ? "Import creators / manage linked Google Sheet" : "Upload creators (CSV)"}
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
              <Upload size={15} />
            </button>
          )}

          {!isInfluencerModule && (
            <button
              type="button"
              onClick={onAcquisitionUploadClick}
              title="Import creators (CSV / Master Sheet)"
              aria-label="Import creators (CSV / Master Sheet)"
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
              <Upload size={15} />
            </button>
          )}

          {isInfluencerModule && isAdmin && (
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

          {isInfluencerModule && isAdmin && (
            <button
              type="button"
              onClick={() => setActivityLogOpen(true)}
              title="Activity log"
              aria-label="Activity log"
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
              <ScrollText size={15} />
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={signOut}
              title={`Signed in as ${user.email} — click to sign out`}
              aria-label="Sign out"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border text-[15px] shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-colors"
              style={{ borderColor: "var(--ln)", background: "var(--panel)", color: "#E0524B" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--up)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--panel)";
              }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
        {user && (
          <ModuleSwitcher
            email={user.email}
            avatarUrl={user.user_metadata?.avatar_url}
            activeModule={activeModule}
            onChange={onModuleChange}
          />
        )}
        </div>
      </div>
      {isInfluencerModule && (
        <>
          <InviteBrandModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
          <ActivityLogModal open={activityLogOpen} onClose={() => setActivityLogOpen(false)} />
        </>
      )}
    </header>
  );
}
