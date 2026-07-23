import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextDef";
import { supabase } from "../lib/supabaseClient";

// The company-domain restriction lives inside a database trigger, and
// Supabase doesn't always translate a rejection from there into a clean,
// readable error string — sometimes it comes back blank, or as a raw
// "{}" / generic database error instead. Anything unhelpful gets replaced
// with a message that actually explains what likely happened.
function friendlyAuthError(error, email) {
  const raw = (error?.message || "").trim();
  const looksUnhelpful = !raw || raw === "{}" || /database error|unexpected_failure/i.test(raw);
  if (looksUnhelpful) {
    return `We couldn't reach ${email}. This usually means it isn't a recognized company email address — double-check you're using your work email. If you think this is a mistake, contact your admin.`;
  }
  return raw;
}

// An invite or password-reset email link lands back here with the type
// baked into the URL hash (#access_token=...&type=invite). Read it once,
// synchronously, on first load — before anything else touches the URL —
// so we know for certain "this person needs to set a password" regardless
// of exactly how/when the Supabase client itself processes that hash.
function readAuthLinkType() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("type");
}

export function AuthProvider({ children }) {
  // undefined = still checking for an existing session, null = signed out,
  // an object = signed in. The undefined/null distinction is what lets the
  // app show a brief loading state instead of flashing the login screen
  // for a moment before a real session is found.
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBrandUser, setIsBrandUser] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(() => {
    const type = readAuthLinkType();
    return type === "invite" || type === "recovery";
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Admin status is just "is this email in the admins table" — checked
  // fresh whenever the session changes, never cached client-side beyond
  // this. The real enforcement is the database's own RLS policies; this
  // is only used to decide what the UI shows.
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("admins")
      .select("email")
      .eq("email", email)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Same idea, but for "is this a brand contact's own account" — used to
  // keep brand accounts out of the internal app entirely. A brand login
  // should only ever be able to reach the specific Brand Dashboard links
  // shared with them, never the internal Workspace itself.
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) {
      setIsBrandUser(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("brand_users")
      .select("email")
      .eq("email", email)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsBrandUser(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signInWithPassword = useCallback(async (email, password) => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(friendlyAuthError(error, email));
      return false;
    }
    return true;
  }, []);

  // Still used for the "Forgot password?" flow — this is the one place a
  // link email is expected and fine, since it's occasional, not routine.
  const requestPasswordReset = useCallback(async (email) => {
    setAuthError("");
    setAuthNotice("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setAuthError(friendlyAuthError(error, email));
      return false;
    }
    setAuthNotice(`Check ${email} for a link to reset your password.`);
    return true;
  }, []);

  // Called from the "Set your password" screen after an invite or reset
  // link — the session is already active at this point (established by
  // the token in the link), so this just attaches a password to it.
  const setPassword = useCallback(async (password) => {
    setAuthError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setAuthError(error.message || "Couldn't save that password — try again.");
      return false;
    }
    setNeedsPasswordSetup(false);
    // Clear the invite/recovery token out of the URL now that it's been
    // used, so refreshing the page doesn't try to process it again.
    window.history.replaceState({}, "", window.location.pathname);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading: session === undefined,
        authError,
        authNotice,
        isAdmin,
        isBrandUser,
        needsPasswordSetup,
        signInWithPassword,
        requestPasswordReset,
        setPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}