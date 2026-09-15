// Team management for the portal: list who has access, change whether
// someone is an admin, set a password, remove access.
//
// This has to live server-side. Changing passwords and reading the user
// list needs the service role key, which must never be shipped to a
// browser. Every call is checked against the admins table first, so only
// an admin can use it regardless of what the frontend allows.
//
// Called as:
//   supabase.functions.invoke("manage-users", { body: { action, ... } })
//
// Actions: "list" | "setRole" | "setPassword" | "remove"
//
// Creating accounts is NOT here — the existing create-team-user function
// already does that, and enforces the curiousmedia.in address rule.
// Duplicating it would mean two places to keep in step.
//
// There is deliberately no "send a reset link" action. For team members
// an admin sets the new password directly and passes it on. Reset links
// are a brand-side thing, handled by Forgot password on the brand login.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Who is asking, and are they allowed? ──────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in." }, 401);

    const { data: caller, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !caller?.user?.email) return json({ error: "Not signed in." }, 401);

    const { data: isAdminRow } = await admin
      .from("admins")
      .select("email")
      .eq("email", caller.user.email)
      .maybeSingle();
    if (!isAdminRow) return json({ error: "Only admins can manage team members." }, 403);

    const body = await req.json();
    const action = body.action;
    const callerEmail = caller.user.email;

    // ── list ──────────────────────────────────────────────────────────
    if (action === "list") {
      const { data: userList, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) return json({ error: error.message }, 400);

      const { data: adminRows } = await admin.from("admins").select("email");
      const adminEmails = new Set((adminRows || []).map((r: { email: string }) => r.email));

      const { data: brandRows } = await admin.from("brand_users").select("email");
      const brandEmails = new Set((brandRows || []).map((r: { email: string }) => r.email));

      // Brand logins are a separate thing from team members and would
      // only confuse this list, so they're left out.
      const users = (userList?.users || [])
        .filter((u) => u.email && !brandEmails.has(u.email))
        .map((u) => ({
          id: u.id,
          email: u.email,
          role: adminEmails.has(u.email!) ? "admin" : "member",
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at,
          isSelf: u.email === callerEmail,
        }))
        .sort((a, b) => (a.email || "").localeCompare(b.email || ""));

      return json({ users });
    }

    // ── setRole ───────────────────────────────────────────────────────
    if (action === "setRole") {
      const email = String(body.email || "").trim().toLowerCase();
      const role = body.role === "admin" ? "admin" : "member";

      // Nobody removes their own admin rights — that's the one way to
      // lock every admin out of this screen by accident.
      if (email === callerEmail && role !== "admin") {
        return json({ error: "You can't remove your own admin access." }, 400);
      }

      if (role === "admin") {
        const { error } = await admin.from("admins").upsert({ email }, { onConflict: "email" });
        if (error) return json({ error: error.message }, 400);
      } else {
        const { error } = await admin.from("admins").delete().eq("email", email);
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    // ── setPassword ───────────────────────────────────────────────────
    if (action === "setPassword") {
      const userId = String(body.userId || "");
      const password = String(body.password || "");
      if (!userId) return json({ error: "Missing user." }, 400);
      if (password.length < 8) return json({ error: "Password needs to be at least 8 characters." }, 400);

      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ── remove ────────────────────────────────────────────────────────
    if (action === "remove") {
      const email = String(body.email || "").trim().toLowerCase();
      const userId = String(body.userId || "");

      if (email === callerEmail) return json({ error: "You can't remove your own access." }, 400);

      await admin.from("admins").delete().eq("email", email);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Something went wrong." }, 500);
  }
});
