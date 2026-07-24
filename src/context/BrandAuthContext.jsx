import { useState, useEffect, useCallback } from "react";
import { BrandAuthContext } from "./brandAuthContextDef";
import { supabaseBrand } from "../lib/supabaseBrandClient";

// Mirrors AuthContext, but talks to supabaseBrand instead of the main
// supabase client — its own separate session, stored under its own key,
// so signing in or out here never touches the Influencer Dashboard's own
// login, and vice versa. Two independent logins that happen to live in
// the same app.
function friendlyAuthError(error, email) {
  const raw = (error?.message || "").trim();
  const looksUnhelpful = !raw || raw === "{}" || /database error|unexpected_failure/i.test(raw);
  if (looksUnhelpful) {
    return `We couldn't sign in as ${email}. Double-check your email and password, or ask your agency contact to confirm your login.`;
  }
  return raw;
}

function readAuthLinkType() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("type");
}

export function BrandAuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(() => {
    const type = readAuthLinkType();
    return type === "invite" || type === "recovery";
  });

  useEffect(() => {
    supabaseBrand.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabaseBrand.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    setAuthError("");
    const { error } = await supabaseBrand.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(friendlyAuthError(error, email));
      return false;
    }
    return true;
  }, []);

  // "Forgot password?" — sends a reset link to the brand's own email,
  // via their own separate session, same idea as the invite flow.
  const requestPasswordReset = useCallback(async (email) => {
    setAuthError("");
    setAuthNotice("");
    const { error } = await supabaseBrand.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) {
      setAuthError(friendlyAuthError(error, email));
      return false;
    }
    setAuthNotice(`Check ${email} for a link to reset your password.`);
    return true;
  }, []);

  const setPassword = useCallback(async (password) => {
    setAuthError("");
    const { error } = await supabaseBrand.auth.updateUser({ password });
    if (error) {
      setAuthError(error.message || "Couldn't save that password — try again.");
      return false;
    }
    setNeedsPasswordSetup(false);
    window.history.replaceState({}, "", window.location.pathname);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabaseBrand.auth.signOut();
  }, []);

  return (
    <BrandAuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading: session === undefined,
        authError,
        authNotice,
        needsPasswordSetup,
        signInWithPassword,
        requestPasswordReset,
        setPassword,
        signOut,
      }}
    >
      {children}
    </BrandAuthContext.Provider>
  );
}