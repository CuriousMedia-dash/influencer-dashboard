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
    return `We couldn't send a sign-in link to ${email}. This usually means it isn't a recognized company email address — double-check you're using your work email. If you think this is a mistake, contact your admin.`;
  }
  return raw;
}

export function AuthProvider({ children }) {
  // undefined = still checking for an existing session, null = signed out,
  // an object = signed in. The undefined/null distinction is what lets the
  // app show a brief loading state instead of flashing the login screen
  // for a moment before a real session is found.
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = useCallback(async (email) => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(friendlyAuthError(error, email));
      return false;
    }
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
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}