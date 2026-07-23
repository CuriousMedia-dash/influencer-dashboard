import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";

/**
 * One-click internal team invite — same idea as InviteBrandModal, but
 * for staff: sends the login email, requires a curiousmedia.in address.
 * Admin-only.
 */
export default function InviteTeamModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const showToast = useToast();

  function handleClose() {
    setEmail("");
    setError("");
    setSuccess(null);
    onClose();
  }

  async function handleInvite() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("invite-team", {
        body: { email: email.trim() },
      });
      if (fnError) throw new Error(fnError.message || "Something went wrong.");
      if (data?.error) throw new Error(data.error);

      setSuccess(data?.alreadyExisted ? "already" : "sent");
      showToast(
        data?.alreadyExisted
          ? "This teammate already had an account"
          : "Invite sent — they'll get an email to set their password",
        true
      );
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
      title="Invite a team member"
      description="They'll get an email to set their own password. Must be a curiousmedia.in address — anything else is blocked automatically."
      maxWidth={440}
    >
      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
        Teammate's email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@curiousmedia.in"
        className="mb-4 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
        style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleInvite();
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
          {success === "already"
            ? "This email already had an account — nothing more to do."
            : "Invite sent. They'll get an email with a link to set their password."}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleInvite}
          disabled={submitting || !email.trim()}
          className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--am)" }}
        >
          {submitting ? "Sending\u2026" : "Send invite"}
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
