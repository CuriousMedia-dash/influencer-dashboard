// Base outreach templates for the "Forward Mail" feature — one per
// category (ACQ_CATEGORIES). Fully editable in the compose modal before
// sending; these are just sensible starting points. {{name}} is replaced
// per-recipient in the subject/preheader only (the body itself is shared
// across the whole BCC send since Resend batch sends don't merge-fields
// by default) — swap in a templating step later if per-recipient
// personalization of the body is needed.
//
// Copy pulled from the Curious Media deck you shared (About Curious,
// Page Performance case studies, Partnerships & Strategy, Team Intro).

import { ACQ_CATEGORIES } from "./acquisitionConstants";

const SHARED_INTRO = `Hi {{name}},

I'm reaching out from Curious Media — we help content creators turn their existing content into new, zero-effort revenue streams.

What started as two creators in a cafe has grown into one of the most agile influencer marketing collectives in the space — we generated $100,000+ in our first year purely from content-led growth, and today we work with 35+ creators alongside production houses like TVF and Girliyapa.`;

const SHARED_PROOF = `A few results from creators we've worked with:
• TVF's Facebook page: grew monthly reach from 40M to 250M in 20 days, 300K+ new followers
• Girliyapa: 1200% reach surge in 12 days
• Oriental Perl: 100M+ views organically, 500K+ followers, zero ad spend
• Hamzy: 300M+ total views, one video hit 39M views organically

We republish your content across our own high-performing pages (with proper credit), so it earns from multiple places at once — no extra time or investment from you.`;

const SHARED_CTA = `Would you be open to a quick call this week to see if it's a fit?

Best,
Curious Media
www.curiousmedia.in · +91 9582050596 · info@curiousmedia.in`;

const CATEGORY_OPENERS = {
  Comedy: "Your comedy content has exactly the kind of shareability that performs best when repurposed across multiple pages.",
  Fiction: "Your fiction storytelling is a great fit for the kind of audience we've built on our fiction-focused pages.",
  Vlogs: "Your vlogs have the personality-led hook that tends to travel well when repurposed for short-form.",
  "Shorts / Reels": "Your short-form content is exactly the format our audience engages with most.",
  Podcast: "Clipped and repurposed the right way, your podcast content can reach a whole new audience beyond your own channel.",
  Regional: "We've had strong results growing regional-language pages and want to bring that same strategy to your content.",
  International: "We've helped international creators tap into large new Indian and global audiences without spending on ads.",
  "Production House": "We already partner with production houses like TVF and Girliyapa, and would love to explore something similar with you.",
  "Meme Page": "Meme and highlight-style content repurposes exceptionally well across our page network.",
};

export function buildDefaultTemplates() {
  return ACQ_CATEGORIES.map((category) => ({
    category,
    subject: `Curious Media × ${category === "Meme Page" ? "your page" : "you"} — new revenue from your existing content`,
    body: [SHARED_INTRO, CATEGORY_OPENERS[category] || "", SHARED_PROOF, SHARED_CTA]
      .filter(Boolean)
      .join("\n\n"),
  }));
}
