import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { signInWithMagicLink, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const ok = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (ok) setSent(true);
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
          Curious Media CRM
        </h1>
        <p className="mb-5 text-sm" style={{ color: "#5B7390" }}>
          Sign in with your work email to continue.
        </p>

        {sent ? (
          <div
            className="rounded-[10px] px-3.5 py-3 text-sm"
            style={{ background: "#EAF7EF", color: "#1E9E5A" }}
          >
            Check your inbox — we've sent a sign-in link to <strong>{email}</strong>. Click it to log in.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#5B7390" }}>
              Work email
            </label>
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
              <div
                className="mb-3 rounded-[8px] px-3 py-2 text-xs"
                style={{ background: "#FCEAE9", color: "#E0524B" }}
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[8px] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#1E6FE0" }}
            >
              {submitting ? "Sending link\u2026" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
