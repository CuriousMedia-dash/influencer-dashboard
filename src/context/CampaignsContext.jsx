import {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import { CampaignsContext } from "./campaignsContextDef";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

// ---- Row <-> app-shape translation ----------------------------------
// The database uses snake_case columns; the rest of the app expects the
// same camelCase shape it always has, so nothing else needs to change.

function linkFromRow(row) {
  return {
    creatorId: row.creator_id,
    commercial: row.commercial ?? "",
    negotiationStatus: row.negotiation_status || "Not Contacted",
    lockedCost: row.locked_cost ?? "",
    counterCost: row.counter_cost ?? "",
    finalCost: row.final_cost ?? "",
    viewership: row.viewership ?? "",
    lockStatus: row.lock_status || "unlocked",
    emailSent: row.email_sent || false,
    approvalReceived: row.approval_received || false,
    executionStage: row.execution_stage || "Draft Video",
    liveLink: row.live_link ?? "",
    liveDate: row.live_date ?? "",
    paymentInfo: row.payment_info ?? null,
    paymentScheduledDate: row.payment_scheduled_date ?? "",
    videoTimelineStart: row.video_timeline_start ?? "",
    videoTimelineEnd: row.video_timeline_end ?? "",
    advanceAmount: row.advance_amount ?? "",
    advancePaid: row.advance_paid || false,
    fullAmount: row.full_amount ?? "",
    fullPaid: row.full_paid || false,
    remark: row.remark ?? "",
  };
}

function campaignFromRow(row, links) {
  return {
    id: row.id,
    name: row.name,
    client: row.client || "",
    budget: row.budget || 0,
    timelineStart: row.timeline_start || "",
    timelineEnd: row.timeline_end || "",
    owner: row.owner || "",
    poc: row.poc || "",
    linksExpected: row.links_expected || "",
    status: row.status || "Planning",
    createdAt: row.created_at,
    createdBy: row.created_by,
    creatorLinks: links,
  };
}

const LINK_FIELD_MAP = {
  commercial: "commercial",
  negotiationStatus: "negotiation_status",
  lockedCost: "locked_cost",
  counterCost: "counter_cost",
  finalCost: "final_cost",
  viewership: "viewership",
  lockStatus: "lock_status",
  emailSent: "email_sent",
  approvalReceived: "approval_received",
  executionStage: "execution_stage",
  liveLink: "live_link",
  liveDate: "live_date",
  paymentInfo: "payment_info",
  paymentScheduledDate: "payment_scheduled_date",
  videoTimelineStart: "video_timeline_start",
  videoTimelineEnd: "video_timeline_end",
  advanceAmount: "advance_amount",
  advancePaid: "advance_paid",
  fullAmount: "full_amount",
  fullPaid: "full_paid",
  remark: "remark",
};

function toLinkColumns(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = LINK_FIELD_MAP[k];
    if (col) out[col] = v;
  });
  return out;
}

const CAMPAIGN_FIELD_MAP = {
  name: "name",
  client: "client",
  budget: "budget",
  timelineStart: "timeline_start",
  timelineEnd: "timeline_end",
  owner: "owner",
  poc: "poc",
  linksExpected: "links_expected",
  status: "status",
};

function toCampaignColumns(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = CAMPAIGN_FIELD_MAP[k];
    if (col) out[col] = v;
  });
  return out;
}

export function CampaignsProvider({ children }) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loads every campaign the current user is allowed to see (their own,
  // or — if they're an admin — everyone's, per the database's own rules,
  // not anything decided here) plus all creator links for those
  // campaigns, then assembles them into the app's usual shape.
  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: campaignRows, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (campErr) {
      console.error("Failed to load campaigns:", campErr.message);
      setCampaigns([]);
      setLoading(false);
      return;
    }

    const { data: linkRows, error: linkErr } = await supabase
      .from("campaign_creator_links")
      .select("*");

    if (linkErr) {
      console.error("Failed to load campaign creator links:", linkErr.message);
    }

    const linksByCampaign = {};
    (linkRows || []).forEach((row) => {
      if (!linksByCampaign[row.campaign_id]) linksByCampaign[row.campaign_id] = [];
      linksByCampaign[row.campaign_id].push(linkFromRow(row));
    });

    setCampaigns(
      (campaignRows || []).map((row) =>
        campaignFromRow(row, linksByCampaign[row.id] || [])
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    loadAll();
  }, [user, loadAll]);

  const createCampaign = useCallback(
    async (campaignInput) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: campaignInput.name || "Untitled Campaign",
          client: campaignInput.client || "",
          budget: campaignInput.budget || 0,
          timeline_start: campaignInput.timelineStart || null,
          timeline_end: campaignInput.timelineEnd || null,
          owner: campaignInput.owner || "",
          poc: campaignInput.poc || "",
          links_expected: campaignInput.linksExpected || "",
          status: campaignInput.status || "Planning",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create campaign:", error.message);
        return null;
      }

      setCampaigns((prev) => [campaignFromRow(data, []), ...prev]);
      return data.id;
    },
    [user]
  );

  const updateCampaign = useCallback(async (campaignId, fields) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, ...fields } : c))
    );
    const { error } = await supabase
      .from("campaigns")
      .update(toCampaignColumns(fields))
      .eq("id", campaignId);
    if (error) console.error("Failed to save campaign changes:", error.message);
  }, []);

  const deleteCampaign = useCallback(async (campaignId) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
    if (error) console.error("Failed to delete campaign:", error.message);
  }, []);

  const getCampaignById = useCallback(
    (campaignId) => campaigns.find((c) => c.id === campaignId),
    [campaigns]
  );

  // Add creators (by id) to a campaign, skipping any already linked.
  const addCreatorsToCampaign = useCallback(
    async (campaignId, creatorIds) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      const existingIds = new Set((campaign?.creatorLinks || []).map((l) => l.creatorId));
      const newIds = creatorIds.filter((cid) => !existingIds.has(cid));
      if (newIds.length === 0) return;

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id !== campaignId
            ? c
            : {
                ...c,
                creatorLinks: [
                  ...c.creatorLinks,
                  ...newIds.map((cid) => linkFromRow({ creator_id: cid })),
                ],
              }
        )
      );

      const rows = newIds.map((cid) => ({
        campaign_id: campaignId,
        creator_id: cid,
        negotiation_status: "Not Contacted",
        lock_status: "unlocked",
        execution_stage: "Draft Video",
      }));

      const { error } = await supabase.from("campaign_creator_links").insert(rows);
      if (error) console.error("Failed to add creators to campaign:", error.message);
    },
    [campaigns]
  );

  const removeCreatorFromCampaign = useCallback(async (campaignId, creatorId) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id !== campaignId
          ? c
          : { ...c, creatorLinks: c.creatorLinks.filter((l) => l.creatorId !== creatorId) }
      )
    );
    const { error } = await supabase
      .from("campaign_creator_links")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("creator_id", creatorId);
    if (error) console.error("Failed to remove creator from campaign:", error.message);
  }, []);

  const updateCreatorLink = useCallback(async (campaignId, creatorId, fields) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id !== campaignId
          ? c
          : {
              ...c,
              creatorLinks: c.creatorLinks.map((l) =>
                l.creatorId === creatorId ? { ...l, ...fields } : l
              ),
            }
      )
    );
    const { error } = await supabase
      .from("campaign_creator_links")
      .update(toLinkColumns(fields))
      .eq("campaign_id", campaignId)
      .eq("creator_id", creatorId);
    if (error) console.error("Failed to save creator link changes:", error.message);
  }, []);

  // Which campaigns a given creator currently belongs to (creator can be in many).
  const getCampaignsForCreator = useCallback(
    (creatorId) =>
      campaigns.filter((c) => c.creatorLinks.some((l) => l.creatorId === creatorId)),
    [campaigns]
  );

  const value = useMemo(
    () => ({
      campaigns,
      loading,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      getCampaignById,
      addCreatorsToCampaign,
      removeCreatorFromCampaign,
      updateCreatorLink,
      getCampaignsForCreator,
    }),
    [
      campaigns,
      loading,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      getCampaignById,
      addCreatorsToCampaign,
      removeCreatorFromCampaign,
      updateCreatorLink,
      getCampaignsForCreator,
    ]
  );

  return (
    <CampaignsContext.Provider value={value}>
      {children}
    </CampaignsContext.Provider>
  );
}