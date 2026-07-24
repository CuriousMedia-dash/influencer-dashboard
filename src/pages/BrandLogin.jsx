import { useState } from "react";
import { useBrandAuth } from "../hooks/useBrandAuth";

export default function BrandLogin() {
  const { signInWithPassword, requestPasswordReset, authError, authNotice } = useBrandAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    await signInWithPassword(email.trim(), password);
    setSubmitting(false);
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    await requestPasswordReset(email.trim());
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "#E7F0FA" }}>
      <div
        className="w-full max-w-sm rounded-[14px] border p-7"
        style={{ background: "#fff", borderColor: "#D9E4F2" }}
      >
        <div
          className="mb-1.5 text-[12px] font-semibold uppercase tracking-[.1em]"
          style={{ color: "#1E6FE0", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Brand Dashboard
        </div>
        <div
          className="mb-4 rounded-[8px] px-3 py-2 text-[11px] leading-relaxed"
          style={{ background: "#F0F5FB", color: "#5B7390" }}
        >
          Restricted to invited brand contacts and agency admins only.
        </div>

        {mode === "signin" ? (
          <>
            <h1 className="mb-1.5 text-xl font-semibold" style={{ fontFamily: "Fraunces, serif", color: "#10243E" }}>
              Sign in to view
            </h1>
            <p className="mb-5 text-sm" style={{ color: "#5B7390" }}>
              Use the email and password you were given for this campaign.
            </p>

            <form onSubmit={handleSignIn}>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#5B7390" }}>Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="mb-3 w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "#D9E4F2", color: "#10243E" }}
              />

              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold" style={{ color: "#5B7390" }}>Password</label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-[11px] font-medium underline decoration-1 underline-offset-2"
                  style={{ color: "#1E6FE0" }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mb-3 w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "#D9E4F2", color: "#10243E" }}
              />

              {authError && (
                <div className="mb-3 rounded-[8px] px-3 py-2 text-xs" style={{ background: "#FCEAE9", color: "#E0524B" }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[8px] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#1E6FE0" }}
              >
                {submitting ? "Please wait\u2026" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px]" style={{ color: "#8FA3BC" }}>
              Haven't received your login yet? Contact the agency team managing this campaign.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-1.5 text-xl font-semibold" style={{ fontFamily: "Fraunces, serif", color: "#10243E" }}>
              Reset your password
            </h1>
            <p className="mb-5 text-sm" style={{ color: "#5B7390" }}>
              Enter your email and we'll send you a link to set a new password.
            </p>

            <form onSubmit={handleResetRequest}>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#5B7390" }}>Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="mb-3 w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "#D9E4F2", color: "#10243E" }}
              />

              {authError && (
                <div className="mb-3 rounded-[8px] px-3 py-2 text-xs" style={{ background: "#FCEAE9", color: "#E0524B" }}>
                  {authError}
                </div>
              )}
              {authNotice && (
                <div className="mb-3 rounded-[8px] px-3 py-2 text-xs" style={{ background: "#E9F7EF", color: "#2BAE66" }}>
                  {authNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mb-2.5 w-full rounded-[8px] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#1E6FE0" }}
              >
                {submitting ? "Sending\u2026" : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full rounded-[8px] border py-2.5 text-sm font-medium"
                style={{ borderColor: "#D9E4F2", color: "#5B7390" }}
              >
                Back to sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}