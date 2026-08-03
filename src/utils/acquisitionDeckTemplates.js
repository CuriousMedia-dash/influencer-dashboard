// Editable slide-deck templates for the "Forward Mail" flow — rebuilt to
// mirror the "Content Onboarding Deck" you shared slide-for-slide (15
// slides, same order, same text, same photos — pulled directly from
// that PDF and saved under public/deck-images/). The only thing that
// differs between categories is the hook line on the cover slide.
// Every field on every slide, including the images, is still editable
// per-send.

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

// image is a /deck-images/*.jpg path pulled straight from your PDF —
// still fully replaceable per-send in the deck editor. hasImage flags
// which slides carried a photo/screenshot in the original deck.
function buildDeckForCategory(category) {
  const hook = CATEGORY_HOOKS[category] || "";
  return {
    category,
    slides: [
      {
        id: "cover",
        layout: "cover",
        heading: "Last Month, Our Creators Made $50,000 From Facebook",
        body: `But you missed it!!\n\n${hook}`,
        image: null,
        hasImage: false,
      },
      {
        id: "about-category",
        layout: "photo-side",
        heading: "About This Category",
        body: "Repurposing content is one of the smartest and most scalable ways to generate revenue in today's multi-platform digital ecosystem. By re-editing, reformatting, and redistributing the same content across platforms like YouTube, Facebook, Snapchat, and OTT apps, content owners can multiply their reach and income — without additional production costs. A prime example of this strategy is TVF (The Viral Fever), one of India's leading digital production houses. TVF has effectively repurposed its original long-form web series like Pitchers, Aspirants, and Kota Factory into shorter clips, reels, and episodic highlights, which they then distributed on platforms like Facebook and YouTube Shorts.",
        image: "/deck-images/about.jpg",
        hasImage: true,
      },
      {
        id: "who-we-are",
        layout: "photo-side",
        heading: "Who We Are",
        body: "We are Curious Media — not just a digital agency, but a movement that believes content should do more than just entertain — it should earn. Our journey started with a cafe to office at 2 locations: to empower creators, production houses, and storytellers to unlock the true value of their content.\n\nFrom managing India's top creators like TVF, Girliyapa, Timeliners, The Screen Patti, and 25+ other production houses, to cracking the code of monetization across Facebook, YouTube, Instagram, and more — we've done it all, and we've done it with heart.\n\nWhat sets us apart? Dedication. We live and breathe platform algorithms, content strategies, performance data, and brand deals.",
        image: "/deck-images/who-we-are.jpg",
        hasImage: true,
      },
      {
        id: "case-tvf",
        layout: "photo-side",
        overline: "HOW WE ARE CRACKING IT",
        heading: "How We Are Cracking It — The Viral Fever (TVF)",
        body: "Under the expert management of Curious Media, TVF's Facebook page experienced a dramatic transformation, evolving from an inactive presence to one of the most dominant fiction pages in India. Within just 20 days, we scaled the monthly reach from 40 million to an astounding 250 million through data-driven strategies and targeted content planning. By analyzing audience behavior and optimizing content formats and posting schedules, we were able to organically grow the page's followership to over 300,000, while generating more than 90 million total views in the same period. This meteoric rise positioned TVF among the Top 5 fiction pages in India.",
        image: "/deck-images/case-tvf.jpg",
        hasImage: true,
      },
      {
        id: "case-realshit",
        layout: "photo-side",
        overline: "HOW WE ARE CRACKING IT",
        heading: "How We Are Cracking It — Realshit",
        body: "Before Us: Inconsistent uploads, unclear content strategy, low engagement & limited growth.\n\nAfter Curious Media Took Over: Streamlined content calendar with trending + value-driven topics, boosted production quality & audience retention, optimized SEO/thumbnails/publishing strategy, consistent growth in views, subscribers, and watch time.\n\nResult: 3x increase in monthly views, 5x growth in engagement, brand collaborations unlocked through improved channel performance.",
        image: "/deck-images/case-realshit.jpg",
        hasImage: true,
      },
      {
        id: "case-oriental-perl",
        layout: "photo-side",
        overline: "HOW WE ARE CRACKING IT",
        heading: "How We Are Cracking It — Oriental Perl",
        body: "Oriental Perl is a standout success story that showcases Curious Media's ability to take a creator from zero visibility to global recognition. Starting with no existing Facebook presence, we developed a robust content and growth strategy tailored to the fast-paced, high-engagement dynamics of the roasting and entertainment niche. We scaled the page organically to over 100 million views — all without a single dollar spent on advertising — and built a thriving community of 500K+ followers across international audiences.",
        image: "/deck-images/case-oriental-perl.jpg",
        hasImage: true,
      },
      {
        id: "case-hamzy",
        layout: "photo-side",
        overline: "HOW WE ARE CRACKING IT",
        heading: "How We Are Cracking It — Hamzy",
        body: "Hamzy's journey with Curious Media is a powerful example of how we help international creators tap into massive new audiences and revenue opportunities — without spending a single rupee on advertising. We strategically curated and repackaged existing YouTube videos into high-performance, platform-optimized formats, resulting in over 300 million total views, including a single video that reached 39 million views organically, and grew Hamzy's followership by over 500K.",
        image: "/deck-images/case-hamzy.jpg",
        hasImage: true,
      },
      {
        id: "how-we-can-help",
        layout: "banner",
        heading: "How We Can Help You",
        body: "Through Monetizing Content — from negotiating brand deals to optimizing ad placements.\nThrough Partnerships — our teams, including strategic planners, post-production, and a dedicated 24/7 support system.\nThrough Page Management — from content ideation and brand value enhancement to client onboarding and monetization, we ensure every page becomes a thriving hub of growth and revenue.",
        image: null,
        hasImage: false,
      },
      {
        id: "partnerships-strategy",
        layout: "photo-side",
        heading: "Partnerships & Strategy",
        body: "Curious Media is transforming the way long-form content creators monetize their work by bridging the gap between storytelling and revenue generation. We don't just distribute content — we develop end-to-end strategies that turn every video into a potential revenue stream, craft tailored content for high-engagement platforms like Facebook and YouTube, and secure lucrative brand + OTT partnerships that resonate with the creator's audience and identity.",
        image: "/deck-images/partnerships-strategy.jpg",
        hasImage: true,
      },
      {
        id: "page-management",
        layout: "text-only",
        heading: "Page Management",
        body: "Curious Media offers a comprehensive suite of page management services designed to help content creators maximize reach, engagement, and revenue — without any upfront investment.\n\nOur Page Management Services Include:\n• Audience Behavior Analysis\n• Content Strategy & Planning\n• YouTube-to-Facebook Repurposing\n• Publishing & Optimization\n• Growth Tracking & Analytics\n• Brand Value Enhancement\n• Client & Brand Onboarding\n• 24/7 Support Team",
        image: null,
        hasImage: false,
      },
      {
        id: "partnership-examples",
        layout: "photo-side",
        heading: "Partnerships Examples",
        body: "More Reach, More Views\nNew Revenue Streams\nNo Extra Time, No Extra Work\nMonetization without Ad Spend",
        image: "/deck-images/partnership-example-1.jpg",
        hasImage: true,
      },
      {
        id: "team",
        layout: "photo-side",
        heading: "Team Intro",
        body: "At the heart of Curious Media's unstoppable digital growth engine is our Social Media Team — a dynamic, data-driven squad led by our visionary founder Aanchal Sharma. With 3+ years of hands-on experience in the social media and content monetization space, this core team is currently handling social media operations for 25+ creators and production houses, turning dormant pages into digital powerhouses and delivering consistent, revenue-driven results.",
        image: "/deck-images/team.jpg",
        hasImage: true,
      },
      {
        id: "client-trust",
        layout: "photo-side",
        heading: "Clients Who Trust Us",
        body: "TVF, Girliyapa, The Blunt, Khooni Monday, Realshit — along with a growing list...",
        image: "/deck-images/client-trust.jpg",
        hasImage: true,
      },
      {
        id: "cta",
        layout: "cta-card",
        heading: "Let's Create Impact Together",
        body: "If you've made it this far, you already know one thing — you're not here by accident. You've got the content, the vision, and the ambition. All you need now is the right partner to turn that passion into performance.\n\nAt Curious Media, we don't just manage content — we unlock its full earning potential across platforms you're already on, and the ones you've yet to dominate. Let's take your existing content to new heights and build something scalable, profitable, and future-ready — together.",
        image: "/deck-images/cta.jpg",
        hasImage: true,
      },
      {
        id: "thank-you",
        layout: "thank-you",
        heading: "Thank You So Much",
        body: "",
        footer: "www.curiousmedia.in  ·  +91 9582050596  ·  @curiousmediaofficial  ·  info@curiousmedia.in",
        image: null,
        hasImage: false,
      },
    ],
  };
}

export function buildDefaultDecks() {
  return ACQ_CATEGORIES.map(buildDeckForCategory);
}
