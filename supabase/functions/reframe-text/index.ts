// Rewrites a piece of deck text using Google's Gemini API (free tier —
// get a key at https://aistudio.google.com/apikey, no card required).
//
// Deploy:  supabase functions deploy reframe-text
// Secret:  supabase secrets set GEMINI_API_KEY=your_key_here
//
// Called from the app as:
//   supabase.functions.invoke("reframe-text", { body: { text, fieldType } })
//   -> { text: "<rewritten version>" }

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = "gemini-1.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { text, fieldType } = await req.json();
    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleNote =
      fieldType === "heading"
        ? "This is a slide HEADING — keep it short, punchy, and bold. One line if possible."
        : "This is slide BODY text — keep roughly the same length, professional and persuasive, suited for a business outreach deck.";

    const prompt =
      `Rewrite the following text to read better — clearer, more persuasive, still professional. ` +
      `${styleNote} Keep the same core meaning and any numbers/facts exactly as given. ` +
      `Return ONLY the rewritten text, no preamble, no quotes, no explanation.\n\nText:\n${text}`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      }
    );

    const body = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: body }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rewritten = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rewritten) {
      return new Response(JSON.stringify({ error: "Gemini returned no text" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text: rewritten }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
