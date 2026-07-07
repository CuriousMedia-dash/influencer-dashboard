import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "../../hooks/useToast";

export default function MoveToCampaignModal({ open, onClose, creatorIds, onDone }) {
  const { campaigns, createCampaign, addCreatorsToCampaign } = useCampaigns();
  const showToast = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState("existing"); // 'existing' | 'new'
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaigns[0]?.id || ""
  );
  const [newName, setNewName] = useState("");

  function reset() {
    setMode("existing");
    setNewName("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleConfirm() {
    if (mode === "new") {
      if (!newName.trim()) return;
      const id = createCampaign({ name: newName.trim() });
      addCreatorsToCampaign(id, creatorIds);
      showToast(`${creatorIds.length} creator(s) added to "${newName.trim()}"`, true);
      reset();
      onDone?.();
      onClose();
      navigate(`/campaigns/${id}`);
      return;
    }

    if (!selectedCampaignId) return;
    const campaign = campaigns.find((c) => c.id === selectedCampaignId);
    addCreatorsToCampaign(selectedCampaignId, creatorIds);
    showToast(
      `${creatorIds.length} creator(s) added to "${campaign?.name}"`,
      true
    );
    reset();
    onDone?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Move to Campaign"
      description={`Add ${creatorIds.length} selected creator${
        creatorIds.length === 1 ? "" : "s"
      } to an existing campaign, or create a new one.`}
    >
      <div className="mb-3.5 flex gap-1.5 rounded-[10px] border p-1" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
        <button
          type="button"
          onClick={() => setMode("existing")}
          className="flex-1 rounded-[7px] py-1.5 text-xs font-medium transition-colors"
          style={{
            background: mode === "existing" ? "var(--am)" : "transparent",
            color: mode === "existing" ? "#fff" : "var(--ink2)",
          }}
        >
          Existing campaign
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className="flex-1 rounded-[7px] py-1.5 text-xs font-medium transition-colors"
          style={{
            background: mode === "new" ? "var(--am)" : "transparent",
            color: mode === "new" ? "#fff" : "var(--ink2)",
          }}
        >
          New campaign
        </button>
      </div>

      {mode === "existing" ? (
        campaigns.length === 0 ? (
          <p className="mb-3 text-xs" style={{ color: "var(--ink3)" }}>
            No campaigns yet — switch to "New campaign" to create one.
          </p>
        ) : (
          <div className="mb-3 flex max-h-[220px] flex-col gap-1.5 overflow-auto">
            {campaigns.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2.5 text-sm transition-colors"
                style={{
                  borderColor:
                    selectedCampaignId === c.id ? "var(--am)" : "var(--ln)",
                  background:
                    selectedCampaignId === c.id
                      ? "rgba(30,111,224,.06)"
                      : "var(--up)",
                }}
              >
                <input
                  type="radio"
                  name="campaign"
                  checked={selectedCampaignId === c.id}
                  onChange={() => setSelectedCampaignId(c.id)}
                  className="accent-[#1E6FE0]"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    {c.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                    {c.client || "No client"} · {c.creatorLinks.length} creator
                    {c.creatorLinks.length === 1 ? "" : "s"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )
      ) : (
        <div className="mb-3.5">
          <label
            htmlFor="newCampaignName"
            className="mb-1 block text-[11px]"
            style={{ color: "var(--ink3)" }}
          >
            Campaign name
          </label>
          <input
            id="newCampaignName"
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Diwali Collection 2026"
            className="w-full rounded-[7px] border px-2.5 py-2 text-xs outline-none"
            style={{
              background: "var(--up)",
              borderColor: "var(--ln)",
              color: "var(--ink)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={
            (mode === "existing" && !selectedCampaignId) ||
            (mode === "new" && !newName.trim())
          }
          className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--am)" }}
        >
          {mode === "new" ? "Create & add" : "Add to campaign"}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-[7px] border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
