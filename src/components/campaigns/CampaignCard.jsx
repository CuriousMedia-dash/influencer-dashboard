import { Link } from "react-router-dom";
import { Users, Calendar, IndianRupee } from "lucide-react";
import { CAMPAIGN_STATUS_COLORS } from "../../utils/constants";
import { hex2rgba } from "../../utils/format";

function fmtBudget(n) {
  if (!n) return "\u2014";
  if (n >= 1e6) return "\u20b9" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return "\u20b9" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return "\u20b9" + n;
}

function fmtDateRange(start, end) {
  if (!start && !end) return "No timeline set";
  const opts = { day: "numeric", month: "short" };
  const s = start ? new Date(start).toLocaleDateString("en-IN", opts) : "?";
  const e = end ? new Date(end).toLocaleDateString("en-IN", opts) : "?";
  return `${s} \u2013 ${e}`;
}

export default function CampaignCard({ campaign }) {
  const statusColor = CAMPAIGN_STATUS_COLORS[campaign.status] || "#8FA3BC";

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="block rounded-[13px] border p-4 shadow-[0_1px_2px_rgba(16,36,62,.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(16,36,62,.08)]"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <h3
          className="text-base font-semibold leading-snug"
          style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}
        >
          {campaign.name}
        </h3>
        <span
          className="flex-shrink-0 whitespace-nowrap rounded-full border px-2 py-[3px] text-[10px] font-semibold"
          style={{
            color: statusColor,
            borderColor: hex2rgba(statusColor, 0.3),
            background: hex2rgba(statusColor, 0.1),
          }}
        >
          {campaign.status}
        </span>
      </div>

      <div className="mb-3 text-[13px]" style={{ color: "var(--ink2)" }}>
        {campaign.client || "No client assigned"}
      </div>

      <div className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--ink2)" }}>
        <div className="flex items-center gap-1.5">
          <IndianRupee size={12} style={{ color: "var(--ink3)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ink)" }}>
            {fmtBudget(campaign.budget)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} style={{ color: "var(--ink3)" }} />
          {fmtDateRange(campaign.timelineStart, campaign.timelineEnd)}
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={12} style={{ color: "var(--ink3)" }} />
          {campaign.creatorLinks.length} creator
          {campaign.creatorLinks.length === 1 ? "" : "s"}
        </div>
      </div>

      {campaign.owner && (
        <div
          className="mt-3 border-t pt-2.5 text-[11px]"
          style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}
        >
          Owner: <span style={{ color: "var(--ink2)" }}>{campaign.owner}</span>
        </div>
      )}
    </Link>
  );
}
