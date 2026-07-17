import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { signInWithPassword, authError } = useAuth();
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
          Influencer Suite
        </h1>
        <p className="mb-5 text-sm" style={{ color: "#5B7390" }}>
          Sign in with your work email and password.
        </p>

        <form onSubmit={handleSignIn}>
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

          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#5B7390" }}>
            Password
          </label>
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
            {submitting ? "Please wait\u2026" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px]" style={{ color: "#8FA3BC" }}>
          New here? We don't do self sign-up — sweet-talk your admin into getting your credentials. 
        </p>
      </div>
    </div>
  );
}