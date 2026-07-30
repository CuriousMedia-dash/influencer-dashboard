// Editable slide-deck templates for the "Forward Mail" flow — one deck
// per category. This mirrors the Curious Media deck you shared
// slide-for-slide (15 slides, same order, same content) — the only
// thing that differs between categories is the hook line on the cover
// slide. Every field on every slide is still editable per-send.

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
// images per-send in the deck editor. hasImage flags which slides
// carried a photo/screenshot in the original deck (so the editor shows
// an image slot there by default), but every slide accepts one.
function buildDeckForCategory(category) {
  const hook = CATEGORY_HOOKS[category] || "";
  return {
    category,
    slides: [
      {
        id: "cover",
        heading: "Last Year, We Made the Revenue of $100,000+ From Content",
        body: `But you missed it!!\n\n${hook}`,
        image: null,
        hasImage: true,
      },
      {
        id: "about",
        heading: "About Curious",
        body: "What started in a cafe with just two passionate content creators and a big vision, has now grown into one of the most agile and result-driven influencer marketing collectives in the game. At Curious Media, we began by helping creators optimize their content for digital platforms — and within our first year, we generated $100,000 in revenue purely through content-led growth. Today, we're proud to represent a dynamic portfolio of 35+ creators, while also collaborating with leading production houses like TVF, Girliyapa, and others. Our strength lies in blending strategic storytelling with platform intelligence to turn creators into brands — and brands into movements.\n\nCurious Media isn't just about content. It's about building influence, driving revenue, and creating real impact.",
        image: null,
        hasImage: true,
      },
      {
        id: "expertise",
        heading: "Our Expertise",
        body: "With a strong network and industry expertise, Curious Media has already been instrumental in supporting leading content houses like TVF, Girliyapa, and Realhit, among others. By optimizing content strategy, managing brand integrations, and leveraging platform algorithms, Curious Media ensures that creators not only reach wider audiences but also turn views into value effectively.\n\nCurious Media excels in building strategic partnerships and crafting customized monetization strategies tailored to each content creator's vision and audience. By collaborating closely with creators, Curious Media identifies the most effective platforms, brand tie-ups, and content formats to maximize revenue.\n\nMonetize Content — From negotiating brand deals to optimizing ad placements.\nContent Partnership — Our teams, including strategic planners, post-production, and a dedicated 24/7 support system.\nPage Management — From content ideation and brand value enhancement to client onboarding and monetization, we ensure every page becomes a thriving hub of growth and revenue.",
        image: null,
        hasImage: false,
      },
      {
        id: "case-tvf",
        heading: "Page Performance — The Viral Fever",
        body: "Under the expert management of Curious Media, TVF's Facebook page experienced a dramatic transformation, evolving from an inactive presence to one of the most dominant fiction pages in India. Within just 20 days, we scaled the monthly reach from 40 million to an astounding 250 million through data-driven strategies and targeted content planning. By analyzing audience behavior and optimizing content formats and posting schedules, we were able to organically grow the page's followership to over 300,000, while generating more than 90 million total views in the same period. Notably, over 10 individual videos crossed the 10 million view milestone — each curated to align with viewer preferences and platform algorithms. This meteoric rise positioned TVF among the Top 5 fiction pages in India, showcasing the power of strategic content repurposing and performance-focused page management.",
        image: null,
        hasImage: true,
      },
      {
        id: "case-girliyapa",
        heading: "Page Performance — Girliyapa",
        body: "Girliyapa's Facebook page witnessed an extraordinary 1200% surge in reach within just 12 days. Starting from a relatively inactive state with a monthly reach of 10 million, we scaled the page to an impressive 120 million through precise audience analysis, tailored content repurposing, and optimal posting strategies. By closely studying the engagement patterns and preferences of Girliyapa's audience, we curated and deployed content that resonated deeply, resulting in over five videos going viral — each surpassing 10 million views. This explosive growth wasn't just numerical; it also elevated Girliyapa's presence and credibility within the fiction content community. Today, the page is proudly recognized among India's Top 5 fiction content pages, a testament to the impact of smart, insight-driven content management.",
        image: null,
        hasImage: true,
      },
      {
        id: "case-oriental-perl",
        heading: "Page Performance — Oriental Perl",
        body: "Oriental Perl is a standout success story that showcases Curious Media's ability to take a creator from zero visibility to global recognition. Starting with no existing Facebook presence, we developed a robust content and growth strategy tailored to the fast-paced, high-engagement dynamics of the roasting and entertainment niche. Through precision-timed content repurposing, curated directly from YouTube, and platform-optimized distribution, we scaled the page organically to over 100 million views — all without a single dollar spent on advertising. In parallel, we built a thriving community of 500K+ followers, amplifying the creator's brand voice across international audiences. Our strategic use of global memes, language-neutral content cuts, and engagement-focused formats allowed Oriental Perl to break through geographic barriers and resonate with roasting content fans around the world.",
        image: null,
        hasImage: true,
      },
      {
        id: "case-hamzy",
        heading: "Page Performance — Hamzy",
        body: "Hamzy's journey with Curious Media is a powerful example of how we help international creators tap into massive new audiences and revenue opportunities — without spending a single rupee on advertising. When we began managing Hamzy's content for Facebook, we strategically curated and repackaged existing YouTube videos into high-performance, platform-optimized formats tailored for Facebook's algorithm and audience behavior. This approach quickly gained traction, resulting in over 300 million total views, including a single video that reached a staggering 39 million views organically. Our insight into global content trends, combined with careful timing and engaging packaging, enabled us to grow Hamzy's followership by over 500K, turning passive viewers into loyal fans.",
        image: null,
        hasImage: true,
      },
      {
        id: "partnerships-strategy",
        heading: "Partnerships & Strategy",
        body: "Curious Media is transforming the way long-form content creators monetize their work by bridging the gap between storytelling and revenue generation. We don't just distribute content — we develop end-to-end strategies that turn every video into a potential revenue stream. Our team works closely with creators to identify brand-fit opportunities, craft tailored content for high-engagement platforms like Facebook and YouTube, and build a roadmap that aligns with their creative vision and financial goals. Through our vast network of brand partnerships and OTT collaborations, we secure lucrative deals that resonate with the creator's audience and brand identity. In parallel, we optimize content formats, timings, and performance metrics to ensure long-form videos are not just watched, but monetized effectively — whether it's a web series, vlog, or documentary-style content.",
        image: null,
        hasImage: true,
      },
      {
        id: "page-management",
        heading: "Page Management",
        body: "Curious Media offers a comprehensive suite of page management services designed to help content creators maximize reach, engagement, and revenue — without any upfront investment. Our services cover the entire content lifecycle, from strategy to execution, ensuring creators can focus on storytelling while we handle the growth engine behind the scenes.\n\nOur Page Management Services Include:\n• Audience Behavior Analysis\n• Content Strategy & Planning\n• YouTube-to-Facebook Repurposing\n• Publishing & Optimization\n• Growth Tracking & Analytics\n• Brand Value Enhancement\n• Client & Brand Onboarding\n• 24/7 Support Team",
        image: null,
        hasImage: false,
      },
      {
        id: "content-partnerships",
        heading: "Content Partnerships",
        body: "At Curious Media, we've introduced a powerful and zero-investment content partnership model that helps creators and brands generate thousands of dollars from their existing content — without doing anything extra.\n\nWhen a creator or brand uploads content on their Facebook page or YouTube channel, we don't just stop there. Our team takes that same content and republishes it (with proper credit and rights) on our own high-performing Facebook pages and YouTube channels that already have massive reach and engagement — so your content starts working for you in multiple places at once, doubling or even tripling the earning potential.\n\nIt's a win-win: you maximize your content's value, we take care of strategy, posting, optimization, and monetization, and you make more money without extra effort or investment.",
        image: null,
        hasImage: false,
      },
      {
        id: "partnership-examples",
        heading: "Partnership Examples",
        body: "More Reach, More Views\nNew Revenue Streams\nNo Extra Time, No Extra Work\nMonetization without Ad Spend",
        image: null,
        hasImage: true,
      },
      {
        id: "team",
        heading: "Team Intro",
        body: "At the heart of Curious Media's unstoppable digital growth engine is our Social Media Team — a dynamic, data-driven squad led by our visionary founder Aanchal Sharma. With fire in her mindset and strategy in her DNA, Aanchal has built a dream team of digital warriors who live and breathe platform algorithms, creator insights, and viral content formulas.\n\nWith 3+ years of hands-on experience in the social media and content monetization space, this core team isn't just managing pages — they're engineering explosive growth. Currently handling social media operations for 25+ creators and production houses, they've turned dormant pages into digital powerhouses, built audiences from zero to millions, and delivered consistent, revenue-driven results.\n\nEvery post is planned with intent. Every strategy is backed by data. And every creator under their wing? Scaling like never before.",
        image: null,
        hasImage: true,
      },
      {
        id: "client-trust",
        heading: "Clients Those Who Trust Us",
        body: "TVF, Girliyapa, Content Ka Keeda, Khooni Monday, Shorts Break — along with a growing list...",
        image: null,
        hasImage: true,
      },
      {
        id: "cta",
        heading: "Let's Create Impact Together",
        body: "If you've made it this far, you already know one thing — you're not here by accident. You've got the content, the vision, and the ambition. All you need now is the right partner to turn that passion into performance.\n\nAt Curious Media, we don't just manage pages — we build empires, create revenue from scratch, and turn creators into brands that can't be ignored.\n\nDon't be the creator who watches others grow. Be the one they wish they partnered with sooner.\n\nLet's create something legendary. We're ready when you are.",
        image: null,
        hasImage: true,
      },
      {
        id: "thank-you",
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
