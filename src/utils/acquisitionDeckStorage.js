// Persists edited deck content per category (localStorage), so editing a
// slide sticks around — switching categories and back, or closing and
// reopening Forward Mail, shows your edited version, not the blank
// template, until you explicitly reset it.

const STORAGE_PREFIX = "acquisition_deck_";

export function getSavedDeckSlides(category) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + category);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDeckSlides(category, slides) {
  try {
    localStorage.setItem(STORAGE_PREFIX + category, JSON.stringify(slides));
  } catch {
    // Storage full or unavailable (e.g. private browsing, or a very
    // image-heavy deck) — edits still work for the rest of this
    // session, they just won't be remembered next time.
  }
}

export function clearSavedDeckSlides(category) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + category);
  } catch {
    // no-op
  }
}
