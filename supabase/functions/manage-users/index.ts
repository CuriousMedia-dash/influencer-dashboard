// Team management for the portal: list who has access, add someone, make
// them an admin or drop them back to member, reset a password, remove
// them entirely.
//
// This has to live server-side. Creating users and changing passwords
// needs the service role key, which must never be shipped to a browser.
// Every call is checked against the admins table first, so only an admin
// can use it regardless of what the frontend allows.
//
// Called as:
//   supabase.functions.invoke("manage-users", { body: { action, ... } })
//
// Actions: "list" | "create" | "setRole" | "resetPassword" | "setPassword" | "remove"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://creators.curiousmedia.in";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM = Deno.env.get("RESEND_FROM");

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
          confirmed: Boolean(u.email_confirmed_at),
          isSelf: u.email === callerEmail,
        }))
        .sort((a, b) => (a.email || "").localeCompare(b.email || ""));

      return json({ users });
    }

    // ── create ────────────────────────────────────────────────────────
    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = body.role === "admin" ? "admin" : "member";

      if (!email.includes("@")) return json({ error: "That doesn't look like an email address." }, 400);
      if (password.length < 8) return json({ error: "Password needs to be at least 8 characters." }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // no confirmation mail — they can sign in straight away
      });
      if (error) return json({ error: error.message }, 400);

      if (role === "admin") {
        const { error: adminError } = await admin.from("admins").upsert({ email }, { onConflict: "email" });
        if (adminError) return json({ error: `User created, but making them an admin failed: ${adminError.message}` }, 400);
      }

      // Welcome mail is best-effort — the account works whether or not
      // this sends, so a mail failure never fails the whole request.
      let emailed = false;
      if (RESEND_API_KEY && RESEND_FROM) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: [email],
              reply_to: callerEmail,
              subject: "Your Curious Media portal access",
              text: [
                `You've been given access to the Curious Media portal.`,
                ``,
                `Sign in here: ${APP_URL}`,
                `Your email: ${email}`,
                `Temporary password: ${password}`,
                ``,
                `Please change your password after signing in.`,
                ``,
                `Added by ${callerEmail}.`,
              ].join("\n"),
            }),
          });
          emailed = res.ok;
        } catch (_) {
          emailed = false;
        }
      }

      return json({ ok: true, id: created?.user?.id, emailed });
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

    // ── resetPassword: mails them a link to set a new one ─────────────
    if (action === "resetPassword") {
      const email = String(body.email || "").trim().toLowerCase();

      const { data: linkData, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        // Straight to the app root, not a dedicated path — the app
        // spots the recovery session on load and shows the set-password
        // screen itself, so no extra route needs to exist.
        options: { redirectTo: APP_URL },
      });
      if (error) return json({ error: error.message }, 400);

      const link = linkData?.properties?.action_link;
      if (!link) return json({ error: "Couldn't generate a reset link." }, 400);

      if (!RESEND_API_KEY || !RESEND_FROM) {
        // No mail configured — hand the link back so it can be passed on
        // directly rather than failing outright.
        return json({ ok: true, emailed: false, link });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [email],
          reply_to: callerEmail,
          subject: "Reset your Curious Media portal password",
          text: [
            `A password reset was requested for your Curious Media portal account.`,
            ``,
            `Set a new password here: ${link}`,
            ``,
            `If you weren't expecting this, you can ignore it and your password stays as it is.`,
          ].join("\n"),
        }),
      });

      return json({ ok: true, emailed: res.ok, link: res.ok ? undefined : link });
    }

    // ── setPassword: admin sets one directly ──────────────────────────
    if (action === "setPassword") {
      const userId = String(body.userId || "");
      const password = String(body.password || "");
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
