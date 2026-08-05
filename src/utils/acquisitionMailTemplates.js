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