// Editable slide-deck templates for the "Forward Mail" flow — one deck
// per category, styled after (and mirroring the full structure of) the
// Curious Media deck you shared: cover, about, expertise, 4 page-
// performance case studies, partnerships & strategy, content
// partnerships, partnership examples, team intro, client trust, and a
// closing CTA. Every slide is editable, and every slide can have its
// own replaceable image (screenshots, logos, photos, etc.) — none are
// pre-filled, so nothing ships with a placeholder graphic.

import { ACQ_CATEGORIES } from "./acquisitionConstants";

export const DECK_BG = "#111111";
export const DECK_ACCENT = "#F5A623"; // orange/yellow accent from the deck

const CATEGORY_HOOKS = {
  Comedy: "Your comedy content has exactly the shareability that performs best repurposed across pages.",
  Fiction: "Your storytelling is a great fit for the audience we've built on our fiction-focused pages.",
  Vlogs: "Your personality-led vlogs travel well when repurposed for short-form.",
  "Shorts / Reels": "Your short-form content is exactly the format our audience engages with most.",
  Podcast: "Clipped and repurposed the right way, your podcast can reach a whole new audience.",
  Regional: "We've had strong results growing regional-language pages with this exact strategy.",
  International: "We've helped international creators tap into large new audiences without ad spend.",
  "Production House": "We already partner with houses like TVF and Girliyapa — let's talk about you next.",
  "Meme Page": "Meme and highlight-style content repurposes exceptionally well across our page network.",
};

// image is always null here — every slide starts blank; add/replace
// images per-send in the deck editor. hasImage just flags which slides
// are meant to carry one (so the editor can show an image slot there).
function buildDeckForCategory(category) {
  const hook = CATEGORY_HOOKS[category] || "";
  return {
    category,
    slides: [
      {
        id: "cover",
        heading: "Last Year, We Made $100,000+ From Content",
        body: `But you missed it!! ${hook}`,
        image: null,
        hasImage: true,
      },
      {
        id: "about",
        heading: "About Curious Media",
        body: "What started with two creators in a cafe has grown into one of the most agile, result-driven influencer marketing collectives around. Within our first year we generated $100,000+ in revenue purely through content-led growth. Today we represent 35+ creators and work alongside production houses like TVF, Girliyapa, and Realhit — blending strategic storytelling with platform intelligence to turn creators into brands, and brands into movements.",
        image: null,
        hasImage: true,
      },
      {
        id: "expertise",
        heading: "Our Expertise",
        body: "Monetize Content — negotiating brand deals and optimizing ad placements.\nContent Partnership — strategic planners, post-production, and a dedicated 24/7 support system.\nPage Management — from ideation and brand value enhancement to onboarding and monetization.",
        image: null,
        hasImage: false,
      },
      {
        id: "case-tvf",
        heading: "Page Performance — The Viral Fever",
        body: "TVF's Facebook page went from an inactive presence to a top-5 fiction page in India. In 20 days we scaled monthly reach from 40M to 250M, growing followership past 300K and generating 90M+ views, with 10+ videos crossing 10M views each.",
        image: null,
        hasImage: true,
      },
      {
        id: "case-girliyapa",
        heading: "Page Performance — Girliyapa",
        body: "A 1200% surge in reach within 12 days — from a 10M monthly reach to 120M — through precise audience analysis and tailored content repurposing. Five-plus videos went viral, each surpassing 10M views.",
        image: null,
        hasImage: true,
      },
      {
        id: "case-oriental-perl",
        heading: "Page Performance — Oriental Perl",
        body: "Taken from zero visibility to global recognition: 100M+ views organically with zero ad spend, and a community of 500K+ followers built across international audiences in the roasting/entertainment niche.",
        image: null,
        hasImage: true,
      },
      {
        id: "case-hamzy",
        heading: "Page Performance — Hamzy",
        body: "300M+ total views with zero ad spend, including a single video that hit 39M views organically — and 500K+ new followers turning passive viewers into loyal fans.",
        image: null,
        hasImage: true,
      },
      {
        id: "partnerships-strategy",
        heading: "Partnerships & Strategy",
        body: "We bridge the gap between storytelling and revenue generation — identifying brand-fit opportunities, crafting tailored content for Facebook and YouTube, and securing brand + OTT partnerships that resonate with your audience and identity.",
        image: null,
        hasImage: true,
      },
      {
        id: "content-partnerships",
        heading: "Content Partnerships",
        body: "A zero-investment model: when you post content, we republish it (with proper credit) across our own high-performing pages — so it earns from multiple places at once, with zero extra time or cost from you. You maximize your content's value; we handle strategy, posting, optimization, and monetization.",
        image: null,
        hasImage: false,
      },
      {
        id: "partnership-examples",
        heading: "Partnership Examples",
        body: "More reach, more views. New revenue streams. No extra time, no extra work. Monetization without ad spend.",
        image: null,
        hasImage: true,
      },
      {
        id: "team",
        heading: "Team Intro",
        body: "Our Social Media Team is led by founder Aanchal Sharma — 3+ years of hands-on experience in social media and content monetization, currently handling operations for 25+ creators and production houses. Every post is planned with intent, every strategy backed by data.",
        image: null,
        hasImage: true,
      },
      {
        id: "client-trust",
        heading: "Clients Who Trust Us",
        body: "TVF, Girliyapa, Content Ka Keeda, Khooni Monday, Shorts Break — along with a growing list.",
        image: null,
        hasImage: true,
      },
      {
        id: "cta",
        heading: "Let's Create Impact Together",
        body: "Don't be the creator who watches others grow — be the one they wish had partnered sooner. We're ready when you are.",
        footer: "www.curiousmedia.in  ·  +91 9582050596  ·  info@curiousmedia.in",
        image: null,
        hasImage: false,
      },
    ],
  };
}

export function buildDefaultDecks() {
  return ACQ_CATEGORIES.map(buildDeckForCategory);
}
