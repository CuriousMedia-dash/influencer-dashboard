// Separate localStorage key from the Influencer Marketing module's
// linked sheet — the two modules aren't interconnected.
const STORAGE_KEY = "acquisition_master_sheet";

export function getSavedAcquisitionSheetLink() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAcquisitionSheetLink({ url, lastSyncedAt }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, lastSyncedAt }));
  } catch {
    // Private browsing / storage disabled — sync still works for this
    // session, it just won't be remembered next time.
  }
}

export function clearAcquisitionSheetLink() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
