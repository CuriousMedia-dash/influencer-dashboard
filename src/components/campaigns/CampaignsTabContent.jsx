import { useState } from "react";
import { Plus } from "lucide-react";
import CampaignCard from "./CampaignCard";
import CreateCampaignModal from "./CreateCampaignModal";
import { useCampaigns } from "../../hooks/useCampaigns";

/**
 * Content shown under the "My Campaigns" tab. No page-level heading here —
 * the tab bar above already communicates which view is active.
 */
export default function CampaignsTabContent() {
  const { campaigns } = useCampaigns();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-1.5">
        <div className="text-[13px]" style={{ color: "var(--ink2)" }}>
          <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
            {campaigns.length}
          </b>{" "}
          campaign{campaigns.length === 1 ? "" : "s"}
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--am)" }}
        >
          <Plus size={14} />
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div
          className="rounded-[13px] border px-5 py-[60px] text-center text-[13px] leading-[1.8]"
          style={{ background: "var(--panel)", borderColor: "var(--ln)", color: "var(--ink3)" }}
        >
          No campaigns yet.
          <br />
          Click "Create Campaign" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
