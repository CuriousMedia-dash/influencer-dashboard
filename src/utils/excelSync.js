import * as XLSX from "xlsx";
import { parseCsvImport, syncCreators } from "./csvImport";
import { supabase } from "../lib/supabaseClient";

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Syncs from a publicly-shared SharePoint/OneDrive Excel file (given its
 * direct-download link — the ?download=1 style URL). Goes through the
 * `fetch-excel-file` Edge Function first, since a browser can't fetch a
 * cross-site file directly. Every worksheet/tab in the workbook is read,
 * matching how the Google Sheets sync also reads every tab.
 *
 * Returns the exact same shape as syncFromSheetUrl (in sheetSync.js), so
 * the calling code doesn't need to know or care which source was used.
 */
export async function syncFromExcelFileUrl(fileUrl, creators, { mirror = false } = {}) {
  // Calling by "swift-worker" (not "fetch-excel-file") on purpose — that's
  // this function's actual URL slug in Supabase. Renaming it in the
  // dashboard only changes the display label, not the real routing
  // address, so the invoke call has to match the address, not the name
  // shown in the Functions list.
  const { data, error } = await supabase.functions.invoke("swift-worker", {
    body: { fileUrl },
  });

  if (error) {
    throw new Error(error.message || "Couldn't reach the Excel-reading function.");
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  const buffer = base64ToArrayBuffer(data.base64);
  const workbook = XLSX.read(buffer, { type: "array" });

  let rows = [];
  let parseErrors = [];
  workbook.SheetNames.forEach((sheetName) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    const parsed = parseCsvImport(csv);
    rows.push(...parsed.rows);
    parseErrors.push(
      ...parsed.errors.map((e) => ({ ...e, message: `[${sheetName}] ${e.message}` }))
    );
  });

  if (rows.length === 0) {
    const msg =
      (parseErrors[0]?.message || "No usable rows found.") +
      (parseErrors.length > 1 ? ` (+${parseErrors.length - 1} more)` : "");
    throw new Error(msg);
  }

  const { merged, added, updated, removed } = syncCreators(creators, rows, { mirror });
  return { merged, added, updated, removed, rowErrors: parseErrors };
}
