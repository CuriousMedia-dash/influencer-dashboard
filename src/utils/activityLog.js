import { supabase } from "../lib/supabaseClient";

/**
 * Records a single action in the activity log. Fire-and-forget — never
 * blocks or breaks the action it's logging, even if the write itself
 * fails (a failed log entry shouldn't stop someone from actually doing
 * their work). Accepts an optional client — Brand Dashboard actions pass
 * supabaseBrand, since it now has its own independent session separate
 * from the main app's.
 */
export function logActivity(user, action, details = {}, client = supabase) {
  if (!user) return;
  client
    .from("activity_log")
    .insert({
      actor_id: user.id,
      actor_email: user.email,
      action,
      details,
    })
    .then(({ error }) => {
      if (error) console.error("Failed to log activity:", error.message);
    });
}

// Turns a raw log row into one readable line for the activity feed.
export function describeActivity(entry) {
  const who = entry.actor_email || "Someone";
  const d = entry.details || {};

  switch (entry.action) {
    case "creator_deleted":
      return `${who} deleted ${d.count > 1 ? `${d.count} creators` : d.name || "a creator"}`;
    case "creators_imported":
      return `${who} imported ${d.added ?? 0} new and updated ${d.updated ?? 0} creators via CSV`;
    case "sheet_synced":
      return `${who} synced the master sheet (${d.added ?? 0} added, ${d.updated ?? 0} updated${d.removed ? `, ${d.removed} removed` : ""})`;
    case "campaign_created":
      return `${who} created campaign "${d.name || "Untitled"}"`;
    case "campaign_deleted":
      return `${who} deleted campaign "${d.name || "Untitled"}"`;
    case "creator_added_to_campaign":
      return `${who} added ${d.creatorName || "a creator"} to "${d.campaignName || "a campaign"}"`;
    case "creator_removed_from_campaign":
      return `${who} removed ${d.creatorName || "a creator"} from "${d.campaignName || "a campaign"}"`;
    case "creator_locked":
      return `${who} locked ${d.creatorName || "a creator"} on "${d.campaignName || "a campaign"}"`;
    case "team_user_created":
      return `${who} created a team account for ${d.email || "someone"}`;
    case "brand_invited":
      return `${who} invited ${d.email || "someone"} as a brand contact`;
    default:
      return `${who} did something (${entry.action})`;
  }
}