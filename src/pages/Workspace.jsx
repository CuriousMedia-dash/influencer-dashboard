import { useState } from "react";
import { useParams } from "react-router-dom";
import CampaignDetails from "./CampaignDetails";
import CreatorsWorkspace from "./CreatorsWorkspace";

/**
 * Top-level router for the "/" and "/campaigns/:id" routes.
 *
 * When no campaign id is present, renders the tabbed workspace (All
 * Creators / My Campaigns). When a campaign id IS present in the URL,
 * renders the full Campaign Details view instead — this keeps a specific
 * campaign deep-linkable/bookmarkable without needing a separate
 * page-level sidebar to navigate there.
 *
 * activeTab lives here (not inside CreatorsWorkspace) so that going into a
 * campaign's detail view and back returns you to whichever tab you were on
 * (e.g. back from a campaign returns to "My Campaigns", not "All Creators").
 */
export default function Workspace() {
  const { id: campaignId } = useParams();
  const [activeTab, setActiveTab] = useState("creators");

  if (campaignId) {
    return <CampaignDetails backTab={activeTab} />;
  }

  return <CreatorsWorkspace activeTab={activeTab} onTabChange={setActiveTab} />;
}
