import { supabase } from "../lib/supabaseClient";

// Storage bucket used for the Convert-PDF and Marketing-Report-CSV
// attachments — see the setup instructions in
// supabase_migration_lead_quality_and_attachments.sql for creating it.
export const ATTACHMENTS_BUCKET = "acquisition-attachments";

/**
 * Uploads a file for a given record and returns its public URL.
 * Path shape: <kind>/<recordId>/<field>-<timestamp>-<filename>
 * so re-uploads never collide and old files aren't silently overwritten.
 */
export async function uploadAcquisitionAttachment(kind, recordId, field, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${kind}/${recordId}/${field}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
}
