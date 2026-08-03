// Deck content for the "Forward Mail" flow. This is the actual deck you
// sent — each slide below is the real page, rasterized directly from
// your PDF (public/deck-images/slides/slide-01.jpg … slide-15.jpg),
// not a rebuilt/reconstructed version. What you see in the editor is
// pixel-for-pixel what you designed.
//
// Categories currently all point at this same deck since it's the only
// one you've provided — if you have separate designed decks per
// category, share them and each can get wired in as its own literal
// set of slide images the same way.

import { ACQ_CATEGORIES } from "./acquisitionConstants";

const SLIDE_COUNT = 15;

function buildSlides() {
  return Array.from({ length: SLIDE_COUNT }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `slide-${n}`, image: `/deck-images/slides/slide-${n}.jpg` };
  });
}

export function buildDefaultDecks() {
  return ACQ_CATEGORIES.map((category) => ({ category, slides: buildSlides() }));
}
