import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function SetPassword() {
  const { setPassword, authError } = useAuth();
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (password.length < 8) {
      setLocalError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Those two passwords don't match.");
      return;
    }

    setSubmitting(true);
    await setPassword(password);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "#E7F0FA" }}>
      <div
        className="w-full max-w-sm rounded-[14px] border p-7"
        style={{ background: "#fff", borderColor: "#D9E4F2" }}
      >
        <h1
          className="mb-1.5 text-xl font-semibold"
          style={{ fontFamily: "Fraunces, serif", color: "#10243E" }}
        >
          Welcome — set your password
        </h1>
        <p className="mb-5 text-sm" style={{ color: "#5B7390" }}>
          Choose a password now. From then on you'll sign in with your email
          and this password — no email link needed each time.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#5B7390" }}>
            New password
          </label>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            placeholder="At least 8 characters"
            className="mb-3 w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D9E4F2", color: "#10243E" }}
          />

          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#5B7390" }}>
            Confirm password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            className="mb-3 w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D9E4F2", color: "#10243E" }}
          />

          {(localError || authError) && (
            <div
              className="mb-3 rounded-[8px] px-3 py-2 text-xs"
              style={{ background: "#FCEAE9", color: "#E0524B" }}
            >
              {localError || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[8px] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "#1E6FE0" }}
          >
            {submitting ? "Saving\u2026" : "Save password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
