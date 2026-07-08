import { useState } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Trash2, Download } from "lucide-react";
import CampaignOverview from "../components/campaigns/CampaignOverview";
import CampaignCreatorsTable from "../components/campaigns/CampaignCreatorsTable";
import ShareCampaignModal from "../components/campaigns/ShareCampaignModal";
import Modal from "../components/ui/Modal";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCreators } from "../hooks/useCreators";
import { useToast } from "../hooks/useToast";
import { campaignCreatorsToCsv, downloadCsv } from "../utils/csvExport";

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    updateCreatorLink,
    removeCreatorFromCampaign,
  } = useCampaigns();
  const { getCreatorById, updateCreatorField } = useCreators();
  const showToast = useToast();

  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const campaign = getCampaignById(id);

  if (!campaign) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] transition-colors"
        style={{ color: "var(--ink2)" }}
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <div className="mb-[18px] flex items-start justify-between gap-3">
        <div>
          <div
            className="mb-[5px] flex items-center gap-2 text-[11px] uppercase tracking-[.13em]"
            style={{ color: "var(--ink3)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--am)" }} />
            CAMPAIGN
          </div>
          <h1
            className="text-[30px] font-semibold"
            style={{ fontFamily: "Fraunces, serif", color: "var(--ink)", letterSpacing: "-0.01em" }}
          >
            {campaign.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#E0524B" }}
        >
          <Trash2 size={13} />
          Delete campaign
        </button>
      </div>

      <CampaignOverview
        campaign={campaign}
        onUpdate={(fields) => updateCampaign(campaign.id, fields)}
      />

      <div className="mb-2.5 flex items-baseline justify-between gap-1.5">
        <div className="text-[13px]" style={{ color: "var(--ink2)" }}>
          <b style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
            {campaign.creatorLinks.length}
          </b>{" "}
          creator{campaign.creatorLinks.length === 1 ? "" : "s"} in this campaign
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const csv = campaignCreatorsToCsv(
              campaign.creatorLinks,
              getCreatorById
            );
            const stamp = new Date().toISOString().slice(0, 10);
            const safeName = campaign.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
            downloadCsv(`${safeName || "campaign"}-${stamp}.csv`, csv);
          }}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs transition-colors"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          <Download size={14} />
          Download CSV
        </button>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--am)" }}
        >
          <Share2 size={14} />
          Share
        </button>
        </div>
      </div>

      <CampaignCreatorsTable
        links={campaign.creatorLinks}
        getCreatorById={getCreatorById}
        onUpdateLink={(creatorId, fields) =>
          updateCreatorLink(campaign.id, creatorId, fields)
        }
        onUpdateCreatorField={updateCreatorField}
        onRemoveLink={(creatorId) => {
          removeCreatorFromCampaign(campaign.id, creatorId);
          showToast("Creator removed from campaign", false);
        }}
        campaignName={campaign.name}
      />

      <ShareCampaignModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        campaign={campaign}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete campaign?"
        description={`This will permanently delete "${campaign.name}" and remove all creator links inside it. This can't be undone.`}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              deleteCampaign(campaign.id);
              showToast("Campaign deleted", false);
              navigate("/");
            }}
            className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white"
            style={{ background: "#E0524B" }}
          >
            Delete campaign
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="rounded-[7px] border px-3.5 py-2.5 text-xs"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}