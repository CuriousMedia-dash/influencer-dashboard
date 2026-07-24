import { useEffect, useState } from "react";
import Modal from "./Modal";
import { supabase } from "../../lib/supabaseClient";
import { describeActivity } from "../../utils/activityLog";

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function timeLabel(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/**
 * Admin-only view of the activity log — who did what, grouped by day,
 * most recent first. Covers: creators deleted, CSV imports, sheet
 * syncs, campaigns created/deleted, creators added/removed from
 * campaigns, creators locked, and team/brand accounts being created.
 */
export default function ActivityLogModal({ open, onClose }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEntries(null);
    setError("");
    supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message || "Couldn't load the activity log.");
          return;
        }
        setEntries(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const groups = [];
  if (entries) {
    let currentDay = null;
    let currentGroup = null;
    entries.forEach((entry) => {
      const label = dayLabel(entry.created_at);
      if (label !== currentDay) {
        currentDay = label;
        currentGroup = { label, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Activity log" description="Who did what, most recent first." maxWidth={520}>
      <div className="max-h-[480px] overflow-auto">
        {error && (
          <div className="rounded-[10px] border p-3 text-xs" style={{ borderColor: "rgba(224,82,75,.3)", background: "rgba(224,82,75,.06)", color: "#E0524B" }}>
            {error}
          </div>
        )}

        {entries === null && !error && (
          <div className="py-8 text-center text-xs" style={{ color: "var(--ink3)" }}>
            Loading…
          </div>
        )}

        {entries && entries.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: "var(--ink3)" }}>
            No activity recorded yet.
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
              {group.label}
            </div>
            <div className="flex flex-col gap-1.5">
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-[8px] border px-3 py-2 text-xs"
                  style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
                >
                  <span>{describeActivity(entry)}</span>
                  <span className="flex-shrink-0" style={{ color: "var(--ink3)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {timeLabel(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
