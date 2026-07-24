import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A completely separate client from the main app's — same project, same
// keys, but its own storage key means its login session lives in a
// different slot in the browser entirely. Without this, both the
// Influencer Dashboard and Brand Dashboard would share one session
// (since they're the same origin), which is exactly why signing out of
// one used to also sign out the other. They're meant to be two
// independent logins that just happen to live in the same app.
export const supabaseBrand = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "cm-brand-auth",
  },
});
