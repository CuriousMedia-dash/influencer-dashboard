// One deck file per genre, kept in the backend so the whole team sees
// the same deck — not per-browser like the old slide-image editor was.
//
// The file itself goes into a Supabase Storage bucket; a row in
// `acquisition_decks` records which file belongs to which genre, what it
// was called, and who last replaced it.

import { supabase } from "../lib/supabaseClient";

export const DECK_BUCKET = "acquisition-decks";

// Creators and Influencers have their own genre lists, and "Devotional"
// exists in both — so the kind has to be part of the key.
function storagePathFor(kind, category, fileName) {
  const safeCategory = String(category).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const ext = (fileName.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
  return `${kind}/${safeCategory}${ext}`;
}

/** Every saved deck for one side (creators or influencers), by genre. */
export async function fetchDecks(kind) {
  const { data, error } = await supabase
    .from("acquisition_decks")
    .select("*")
    .eq("kind", kind);
  if (error) {
    console.error("Couldn't load saved decks:", error.message);
    return new Map();
  }
  return new Map((data || []).map((row) => [row.category, row]));
}

/**
 * Saves (or replaces) the deck for one genre. Uploading over the same
 * path means a genre only ever has one deck file — replacing it doesn't
 * leave the old one behind taking up space.
 */
export async function uploadDeck({ kind, category, file, userId }) {
  const path = storagePathFor(kind, category, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DECK_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const row = {
    kind,
    category,
    file_name: file.name,
    mime_type: file.type || "",
    file_size: file.size,
    storage_path: path,
    uploaded_at: new Date().toISOString(),
    uploaded_by: userId || null,
  };

  const { data, error } = await supabase
    .from("acquisition_decks")
    .upsert(row, { onConflict: "kind,category" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Removes the deck for one genre, file and record together. */
export async function removeDeck(deckRow) {
  if (!deckRow) return;
  await supabase.storage.from(DECK_BUCKET).remove([deckRow.storage_path]);
  const { error } = await supabase
    .from("acquisition_decks")
    .delete()
    .eq("kind", deckRow.kind)
    .eq("category", deckRow.category);
  if (error) throw new Error(error.message);
}

/** The raw file, for downloading or attaching to a mail. */
export async function downloadDeckBlob(deckRow) {
  const { data, error } = await supabase.storage.from(DECK_BUCKET).download(deckRow.storage_path);
  if (error) throw new Error(error.message);
  return data;
}

/** Base64 (no data: prefix) — the shape the mail function expects. */
export async function deckAsBase64(deckRow) {
  const blob = await downloadDeckBlob(deckRow);
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Couldn't read the deck file."));
    reader.readAsDataURL(blob);
  });
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
