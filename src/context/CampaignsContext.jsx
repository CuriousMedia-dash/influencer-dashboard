import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { CampaignsContext } from "./campaignsContextDef";

// Campaigns aren't backed by the Google Sheet sync (that's creators-only),
// so they're persisted to localStorage directly — otherwise every reload
// would wipe out real campaigns with nothing to show in their place.
const CAMPAIGNS_CACHE_KEY = "cm_campaigns_cache";

function loadCachedCampaigns() {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CampaignsProvider({ children }) {
  const [campaigns, setCampaigns] = useState(() => loadCachedCampaigns());
  const nextCampaignNum = useRef(null);
  if (nextCampaignNum.current === null) {
    nextCampaignNum.current = campaigns.reduce((max, c) => {
      const n = parseInt(String(c.id).replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n >= max ? n + 1 : max;
    }, 1);
  }

  useEffect(() => {
    try {
      localStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify(campaigns));
    } catch {
      // Ignore quota/availability errors — in-memory state still works
      // for the current session.
    }
  }, [campaigns]);

  const createCampaign = useCallback((campaignInput) => {
    const id = "camp_" + nextCampaignNum.current++;
    const newCampaign = {
      id,
      name: campaignInput.name || "Untitled Campaign",
      client: campaignInput.client || "",
      budget: campaignInput.budget || 0,
      timelineStart: campaignInput.timelineStart || "",
      timelineEnd: campaignInput.timelineEnd || "",
      owner: campaignInput.owner || "",
      poc: campaignInput.poc || "",
      linksExpected: campaignInput.linksExpected || "",
      status: campaignInput.status || "Planning",
      createdAt: new Date().toISOString(),
      creatorLinks: [],
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    return id;
  }, []);

  const updateCampaign = useCallback((campaignId, fields) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, ...fields } : c))
    );
  }, []);

  const deleteCampaign = useCallback((campaignId) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
  }, []);

  const getCampaignById = useCallback(
    (campaignId) => campaigns.find((c) => c.id === campaignId),
    [campaigns]
  );

  // Add creators (by id) to a campaign, skipping any already linked.
  const addCreatorsToCampaign = useCallback((campaignId, creatorIds) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaignId) return c;
        const existingIds = new Set(c.creatorLinks.map((l) => l.creatorId));
        const newLinks = creatorIds
          .filter((cid) => !existingIds.has(cid))
          .map((cid) => ({
            creatorId: cid,
            commercial: "",
            negotiationStatus: "Not Contacted",
            lockedCost: "",
            counterCost: "",
            finalCost: "",
            viewership: "",
            lockStatus: "unlocked",
            emailSent: false,
            approvalReceived: false,
            executionStage: "Draft Video",
            liveLink: "",
            liveDate: "",
            paymentInfo: null,
            advanceAmount: "",
            advancePaid: false,
            fullAmount: "",
            fullPaid: false,
            remark: "",
          }));
        return { ...c, creatorLinks: [...c.creatorLinks, ...newLinks] };
      })
    );
  }, []);

  const removeCreatorFromCampaign = useCallback((campaignId, creatorId) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id !== campaignId
          ? c
          : {
              ...c,
              creatorLinks: c.creatorLinks.filter(
                (l) => l.creatorId !== creatorId
              ),
            }
      )
    );
  }, []);

  const updateCreatorLink = useCallback((campaignId, creatorId, fields) => {
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
  }, []);

  // Which campaigns a given creator currently belongs to (creator can be in many).
  const getCampaignsForCreator = useCallback(
    (creatorId) =>
      campaigns.filter((c) =>
        c.creatorLinks.some((l) => l.creatorId === creatorId)
      ),
    [campaigns]
  );

  const value = useMemo(
    () => ({
      campaigns,
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
