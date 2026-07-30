// Deploy: supabase functions deploy send-acquisition-mail
// Secrets:  supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM="Curious Media <hello@yourdomain.com>"
// (RESEND_FROM must be on a domain verified in your Resend account.)
//
// Called from the app as:
//   supabase.functions.invoke("send-acquisition-mail", { body: { bcc, subject, html, attachments } })

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resend caps a single call's recipients, so a big BCC list is sent in
// batches rather than one giant call.
const BCC_CHUNK_SIZE = 45;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { bcc, subject, html, attachments } = await req.json();

    if (!Array.isArray(bcc) || bcc.length === 0) {
      return new Response(JSON.stringify({ error: "bcc must be a non-empty array of emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = [];
    for (let i = 0; i < bcc.length; i += BCC_CHUNK_SIZE) chunks.push(bcc.slice(i, i + BCC_CHUNK_SIZE));

    const results = [];
    for (const chunk of chunks) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: RESEND_FROM, // send "to" self, real recipients hidden in bcc
          bcc: chunk,
          subject,
          html,
          attachments: (attachments || []).map((a: { filename: string; content: string }) => ({
            filename: a.filename,
            content: a.content, // base64, no data: prefix
          })),
        }),
      });
      const body = await resp.json();
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: body }), {
          status: resp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      results.push(body);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
