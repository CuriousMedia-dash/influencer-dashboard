// Deck content for the "Forward Mail" flow. Each slide is simply the
// real deck page, exactly as designed — no reconstruction, no editable
// text fields. The only thing you can change per slide is the image
// itself (replace it if you want a different slide there).
//
// Categories currently all point at this same deck since it's the only
// one you've provided — if you have separate designed decks per
// category, share them and each can get wired in as its own set of
// slide images the same way.

const SLIDE_COUNT = 15;

function buildSlides() {
  return Array.from({ length: SLIDE_COUNT }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `slide-${n}`, image: `/deck-images/slides/slide-${n}.jpg` };
  });
}

export function buildDefaultDecks(categories) {
  return categories.map((category) => ({ category, slides: buildSlides() }));
}
