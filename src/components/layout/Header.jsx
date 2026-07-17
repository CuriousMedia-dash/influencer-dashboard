import { Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";

export default function Header({ onGearClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

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
            title="Import creators from a file"
            aria-label="Import creators from a file"
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
    </header>
  );
}
