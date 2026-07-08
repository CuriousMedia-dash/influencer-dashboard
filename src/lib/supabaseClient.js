import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This almost always means .env.local is missing, misspelled, or the
  // dev server wasn't restarted after adding it — Vite only reads env
  // vars at startup.
  console.error(
    "Missing Supabase env vars — check .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart `npm run dev`."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
