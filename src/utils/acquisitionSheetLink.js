// Separate saved master-sheet link per resource (creators vs
// influencers) and separate again from the Influencer Marketing
// module's linked sheet — none of these should collide.

function storageKey(kind) {
  return `acquisition_master_sheet_${kind}`;
}

export function getSavedAcquisitionSheetLink(kind) {
  try {
    const raw = localStorage.getItem(storageKey(kind));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAcquisitionSheetLink(kind, { url, lastSyncedAt }) {
  try {
    localStorage.setItem(storageKey(kind), JSON.stringify({ url, lastSyncedAt }));
  } catch {
    // Private browsing / storage disabled — sync still works for this
    // session, it just won't be remembered next time.
  }
}

export function clearAcquisitionSheetLink(kind) {
  try {
    localStorage.removeItem(storageKey(kind));
  } catch {
    // no-op
  }
}
