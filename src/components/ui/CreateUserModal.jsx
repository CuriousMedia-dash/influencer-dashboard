import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { getFunctionErrorMessage } from "../../utils/functionError";
import { logActivity } from "../../utils/activityLog";

/**
 * Creates a team member's account directly — admin picks both the email
 * and the password right here, no invite email involved. The account is
 * immediately usable with those exact credentials.
 */
export default function CreateUserModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const showToast = useToast();
  const { user } = useAuth();

  function handleClose() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    onClose();
  }

  async function handleCreate() {
    if (!email.trim() || !password) return;
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-team-user", {
        body: { email: email.trim(), password },
      });
      if (fnError || data?.error) {
        throw new Error(await getFunctionErrorMessage(fnError, data));
      }

      setSuccess(true);
      showToast(`Account created for ${email.trim()} — they can sign in right away`, true);
      logActivity(user, "team_user_created", { email: email.trim() });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a team user"
      description="Set their email and password directly — no invite email, they can sign in with these right away. Must be a curiousmedia.in address."
      maxWidth={440}
    >
      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
        Email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@curiousmedia.in"
        className="mb-3 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
        style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
        autoFocus
      />

      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
        Password
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
        className="mb-3 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
        style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
      />

      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
        Confirm password
      </label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Type it again"
        className="mb-4 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
        style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
        }}
      />

      {error && (
        <div
          className="mb-4 rounded-[10px] border p-3 text-xs"
          style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 rounded-[10px] border p-3 text-xs font-medium"
          style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}
        >
          Account created. Share the email and password with them directly — they can sign in immediately.
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || !email.trim() || !password || !confirmPassword}
          className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--am)" }}
        >
          {submitting ? "Creating\u2026" : "Create user"}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-[7px] border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}