import { useCallback, useEffect, useState } from "react";
import { Shield, User, KeyRound, Trash2, Plus, RefreshCw } from "lucide-react";
import Modal from "./Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";

/**
 * Who can get into the portal, and at what level. Everything here runs
 * through the manage-users function rather than the browser, because
 * creating users and changing passwords needs a key that must never
 * leave the server. That function re-checks admin rights on every call,
 * so this screen being hidden isn't the only thing protecting it.
 */
export default function TeamModal({ open, onClose }) {
  const showToast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyEmail, setBusyEmail] = useState("");

  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [saving, setSaving] = useState(false);

  const call = useCallback(async (body) => {
    const { data, error: fnError } = await supabase.functions.invoke("manage-users", { body });
    if (fnError) {
      // The function returns its reason in the body, which supabase-js
      // hides behind a generic message — dig it out so the person sees
      // what actually went wrong.
      let detail = fnError.message;
      try {
        const parsed = await fnError.context?.json?.();
        if (parsed?.error) detail = parsed.error;
      } catch {
        // Keep the generic message.
      }
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await call({ action: "list" });
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [open, load]);

  async function changeRole(user, role) {
    setBusyEmail(user.email);
    try {
      await call({ action: "setRole", email: user.email, role });
      setUsers((prev) => prev.map((u) => (u.email === user.email ? { ...u, role } : u)));
      showToast(`${user.email} is now ${role === "admin" ? "an admin" : "a member"}.`, true);
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setBusyEmail("");
    }
  }

  async function sendReset(user) {
    setBusyEmail(user.email);
    try {
      const data = await call({ action: "resetPassword", email: user.email });
      if (data.emailed) {
        showToast(`Reset link sent to ${user.email}.`, true);
      } else if (data.link) {
        await navigator.clipboard?.writeText(data.link).catch(() => {});
        showToast("Mail didn't send — reset link copied to your clipboard instead.", false);
      }
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setBusyEmail("");
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`Remove ${user.email}? They lose access immediately.`)) return;
    setBusyEmail(user.email);
    try {
      await call({ action: "remove", email: user.email, userId: user.id });
      setUsers((prev) => prev.filter((u) => u.email !== user.email));
      showToast(`${user.email} removed.`, true);
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setBusyEmail("");
    }
  }

  async function addUser() {
    setSaving(true);
    try {
      const data = await call({
        action: "create",
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      showToast(
        data.emailed
          ? `${newEmail.trim()} added — their sign-in details have been mailed to them.`
          : `${newEmail.trim()} added. Mail didn't send, so pass the password on yourself.`,
        data.emailed
      );
      setNewEmail("");
      setNewPassword("");
      setNewRole("member");
      setAdding(false);
      load();
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Team access" maxWidth={620}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
            {loading ? "Loading\u2026" : `${users.length} ${users.length === 1 ? "person" : "people"} with access`}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              title="Refresh"
              className="flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[12px]"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
            >
              <RefreshCw size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white"
              style={{ background: "var(--am)" }}
            >
              <Plus size={13} />
              Add person
            </button>
          </div>
        </div>

        {adding && (
          <div className="rounded-[10px] border p-3" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
            <div className="flex flex-col gap-2">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@curiousmedia.in"
                className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
                style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Temporary password (at least 8 characters)"
                className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
                style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
              />
              <div className="flex items-center gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="rounded-[8px] border px-2.5 py-1.5 text-[13px]"
                  style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  onClick={addUser}
                  disabled={saving || !newEmail.trim() || newPassword.length < 8}
                  className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--am)" }}
                >
                  {saving ? "Adding\u2026" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-[8px] border px-3 py-1.5 text-[12px]"
                  style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                >
                  Cancel
                </button>
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                They can sign in straight away with this password, and their details are mailed to them.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-[10px] border p-3 text-[12px]"
            style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}
          >
            {error}
          </div>
        )}

        <div className="flex max-h-[380px] flex-col gap-1.5 overflow-auto">
          {users.map((u) => {
            const busy = busyEmail === u.email;
            const isAdminUser = u.role === "admin";
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-2 rounded-[10px] border p-2.5"
                style={{ borderColor: "var(--ln)", background: "var(--panel)", opacity: busy ? 0.6 : 1 }}
              >
                <div
                  className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isAdminUser ? "rgba(30,111,224,.10)" : "var(--up)",
                    color: isAdminUser ? "var(--am)" : "var(--ink3)",
                  }}
                >
                  {isAdminUser ? <Shield size={13} /> : <User size={13} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]" style={{ color: "var(--ink)" }}>
                    {u.email}
                    {u.isSelf && (
                      <span className="ml-1.5 text-[11px]" style={{ color: "var(--ink3)" }}>
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                    {u.lastSignInAt
                      ? `Last signed in ${new Date(u.lastSignInAt).toLocaleDateString()}`
                      : "Hasn't signed in yet"}
                  </div>
                </div>

                <select
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value)}
                  disabled={busy || u.isSelf}
                  title={u.isSelf ? "You can't change your own access" : "Change access level"}
                  className="rounded-[7px] border px-2 py-1 text-[12px] disabled:opacity-50"
                  style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>

                <button
                  type="button"
                  onClick={() => sendReset(u)}
                  disabled={busy}
                  title="Mail them a password reset link"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border disabled:opacity-50"
                  style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                >
                  <KeyRound size={12} />
                </button>

                {!u.isSelf && (
                  <button
                    type="button"
                    onClick={() => removeUser(u)}
                    disabled={busy}
                    title="Remove their access"
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border disabled:opacity-50"
                    style={{ borderColor: "var(--ln)", color: "#E0524B" }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {!loading && users.length === 0 && !error && (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--ink3)" }}>
              Nobody here yet.
            </div>
          )}
        </div>

        <div className="text-[11px] leading-relaxed" style={{ color: "var(--ink3)" }}>
          Admins can manage the team, link the master sheet and see the activity log. Members can do everything else.
          Brand logins are separate and aren't listed here.
        </div>
      </div>
    </Modal>
  );
}
