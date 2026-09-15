import { useCallback, useEffect, useState } from "react";
import { Shield, User, KeyRound, Trash2, Plus, RefreshCw } from "lucide-react";
import Modal from "./Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { logActivity } from "../../utils/activityLog";
import { getFunctionErrorMessage } from "../../utils/functionError";
import { openCredentialsEmail } from "../../utils/email";

/**
 * Who can get into the portal, and at what level. Everything here runs
 * through the manage-users function rather than the browser, because
 * creating users and changing passwords needs a key that must never
 * leave the server. That function re-checks admin rights on every call,
 * so this screen being hidden isn't the only thing protecting it.
 */
// Deliberately avoids characters that get misread when someone types
// this in by hand — no l/1/I, no O/0.
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  values.forEach((v) => {
    out += chars[v % chars.length];
  });
  return out;
}

export default function TeamModal({ open, onClose }) {
  const showToast = useToast();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyEmail, setBusyEmail] = useState("");

  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [saving, setSaving] = useState(false);
  // Held after a successful create so the credentials can be mailed —
  // the password is never retrievable again afterwards.
  const [created, setCreated] = useState(null);
  // Which row has its password form open, what's typed in it, and the
  // last one saved (kept only so it can be mailed).
  const [resetFor, setResetFor] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetDone, setResetDone] = useState(null);

  const call = useCallback(async (name, body) => {
    const { data, error: fnError } = await supabase.functions.invoke(name, { body });
    if (fnError || data?.error) throw new Error(await getFunctionErrorMessage(fnError, data));
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await call("manage-users", { action: "list" });
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
      await call("manage-users", { action: "setRole", email: user.email, role });
      setUsers((prev) => prev.map((u) => (u.email === user.email ? { ...u, role } : u)));
      showToast(`${user.email} is now ${role === "admin" ? "an admin" : "a member"}.`, true);
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setBusyEmail("");
    }
  }

  /**
   * Sets a team member's password outright rather than mailing them a
   * link to do it themselves. Reset links are a brand-side thing — for
   * staff it's faster to set one and tell them.
   */
  async function savePassword(user) {
    if (resetPassword.length < 8) {
      showToast("Password needs to be at least 8 characters.", false);
      return;
    }
    setBusyEmail(user.email);
    try {
      await call("manage-users", { action: "setPassword", userId: user.id, password: resetPassword });
      // Held so it can be mailed — once this closes it's gone for good,
      // since a saved password can never be read back out.
      setResetDone({ email: user.email, password: resetPassword });
      setResetFor(null);
      setResetPassword("");
      showToast(`Password changed for ${user.email}.`, true);
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
      await call("manage-users", { action: "remove", email: user.email, userId: user.id });
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
      const email = newEmail.trim();
      // Same function the Create User button has always used, so the
      // rules it enforces (curiousmedia.in addresses) still apply and
      // there's only one place that creates accounts.
      await call("create-team-user", { email, password: newPassword });
      if (newRole === "admin") {
        await call("manage-users", { action: "setRole", email, role: "admin" });
      }
      logActivity(user, "team_user_created", { email });
      showToast(`${email} can sign in now. Send them the password.`, true);
      setCreated({ email, password: newPassword });
      setNewEmail("");
      setNewPassword("");
      setNewRole("member");
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
                They can sign in straight away with this password. Must be a curiousmedia.in address.
              </div>

              {created && (
                <div
                  className="rounded-[8px] border p-2.5 text-[11px]"
                  style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}
                >
                  <div className="mb-2">{created.email} created.</div>
                  <button
                    type="button"
                    onClick={async () => {
                      await openCredentialsEmail({ to: created.email, password: created.password });
                    }}
                    className="rounded-[6px] border px-2.5 py-1.5 text-[11px] font-semibold"
                    style={{ borderColor: "rgba(43,174,102,.3)", background: "var(--panel)", color: "#2BAE66" }}
                  >
                    Open mail draft with their login details
                  </button>
                </div>
              )}
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
                  onClick={() => {
                    setResetDone(null);
                    setResetPassword("");
                    setResetFor(resetFor === u.email ? null : u.email);
                  }}
                  disabled={busy}
                  title="Set a new password for them"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border disabled:opacity-50"
                  style={{
                    borderColor: resetFor === u.email ? "var(--am)" : "var(--ln)",
                    color: resetFor === u.email ? "var(--am)" : "var(--ink2)",
                  }}
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

                {resetFor === u.email && (
                  <div className="mt-1 flex w-full flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: "var(--ln)" }}>
                    <input
                      type="text"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="New password (at least 8 characters)"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePassword(u);
                        if (e.key === "Escape") setResetFor(null);
                      }}
                      className="min-w-[180px] flex-1 rounded-[7px] border px-2 py-1 text-[12px] outline-none"
                      style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setResetPassword(generatePassword())}
                      className="rounded-[7px] border px-2.5 py-1 text-[12px]"
                      style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                    >
                      Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => savePassword(u)}
                      disabled={busy || resetPassword.length < 8}
                      className="rounded-[7px] px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--am)" }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetFor(null)}
                      className="rounded-[7px] border px-2.5 py-1 text-[12px]"
                      style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {resetDone?.email === u.email && (
                  <div
                    className="mt-1 flex w-full flex-wrap items-center gap-2 rounded-[8px] border p-2 text-[11px]"
                    style={{ borderColor: "rgba(43,174,102,.3)", background: "rgba(43,174,102,.06)", color: "#2BAE66" }}
                  >
                    <span className="flex-1">
                      New password: <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{resetDone.password}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => openCredentialsEmail({ to: resetDone.email, password: resetDone.password })}
                      className="rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold"
                      style={{ borderColor: "rgba(43,174,102,.3)", background: "var(--panel)", color: "#2BAE66" }}
                    >
                      Mail it to them
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetDone(null)}
                      className="rounded-[6px] border px-2 py-1 text-[11px]"
                      style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}
                    >
                      Done
                    </button>
                  </div>
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
