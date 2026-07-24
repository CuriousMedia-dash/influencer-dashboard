import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { getFunctionErrorMessage } from "../../utils/functionError";
import { logActivity } from "../../utils/activityLog";

/**
 * One-click brand invite: sends the login email AND adds them to the
 * global brand allow-list, together, via a single Edge Function call —
 * no more manually doing both steps in the Supabase dashboard and SQL
 * editor separately.
 */
export default function InviteBrandModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const showToast = useToast();
  const { user } = useAuth();

  function handleClose() {
    setName("");
    setEmail("");
    setError("");
    setSuccess(null);
    onClose();
  }

  async function handleInvite() {
    if (!email.trim() || !name.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess(null);
    try {
      // Calling by "hyper-action" (not "invite-brand") on purpose — that's
      // this function's actual URL slug in Supabase. Renaming it in the
      // dashboard only changes the display label, not the real routing
      // address, so the invoke call has to match the address.
      const { data, error: fnError } = await supabase.functions.invoke("hyper-action", {
        body: { email: email.trim(), name: name.trim() },
      });
      if (fnError || data?.error) {
        throw new Error(await getFunctionErrorMessage(fnError, data));
      }

      setSuccess(data?.alreadyExisted ? "already" : "sent");
      showToast(
        data?.alreadyExisted
          ? "Already had an account — added to the brand list"
          : "Invite sent — they'll get an email to set their password",
        true
      );
      logActivity(user, "brand_invited", { email: email.trim(), name: name.trim() });
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
      title="Invite a brand contact"
      description="They'll get an email to set their own password. Once that's done, this email can log in and open any Brand Dashboard link you send them — for any campaign, not just one."
      maxWidth={440}
    >
      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
        Brand contact's name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Priya Sharma"
        className="mb-4 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
        style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
        autoFocus
      />

      <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink2)" }}>
        Brand's email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="contact@brandcompany.com"
        className="mb-4 w-full rounded-[8px] border px-3 py-2.5 text-xs outline-none"
        style={{ borderColor: "var(--ln)", color: "var(--ink)" }}
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
            ? "This email already had an account — added to the brand list, no new email sent."
            : "Invite sent. They'll get an email with a link to set their password."}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleInvite}
          disabled={submitting || !email.trim() || !name.trim()}
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