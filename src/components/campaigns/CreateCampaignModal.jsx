import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "../../hooks/useToast";
import { CAMPAIGN_STATUSES } from "../../utils/constants";

const EMPTY_FORM = {
  name: "",
  client: "",
  budget: "",
  timelineStart: "",
  timelineEnd: "",
  owner: "",
  poc: "",
  linksExpected: "",
  status: "Planning",
};

export default function CreateCampaignModal({ open, onClose }) {
  const { createCampaign } = useCampaigns();
  const showToast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const id = await createCampaign({
      ...form,
      budget: Number(form.budget) || 0,
    });
    showToast(`Campaign "${form.name.trim()}" created`, true);
    setForm(EMPTY_FORM);
    onClose();
    navigate(`/campaigns/${id}`);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Campaign"
      description="Set up the basics now — you can add creators and edit details any time."
      maxWidth={480}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Campaign name *">
          <input
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Diwali Collection 2026"
            className="ep-text-input"
            required
          />
        </Field>

        <Field label="Client">
          <input
            type="text"
            value={form.client}
            onChange={(e) => update("client", e.target.value)}
            placeholder="e.g. Nimbus Beverages"
            className="ep-text-input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget (₹)">
            <input
              type="number"
              min="0"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
              placeholder="0"
              className="ep-text-input"
            />
          </Field>
          <Field label="Links expected">
            <input
              type="number"
              min="0"
              value={form.linksExpected}
              onChange={(e) => update("linksExpected", e.target.value)}
              placeholder="e.g. 10"
              className="ep-text-input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input
              type="date"
              value={form.timelineStart}
              onChange={(e) => update("timelineStart", e.target.value)}
              className="ep-text-input"
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.timelineEnd}
              onChange={(e) => update("timelineEnd", e.target.value)}
              className="ep-text-input"
            />
          </Field>
        </div>

        <Field label="Owner / POC">
          <input
            type="text"
            value={form.poc}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, owner: v, poc: v }));
            }}
            placeholder="e.g. Aditi Rao"
            className="ep-text-input"
          />
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="ep-text-input"
          >
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-1 flex gap-2">
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="flex-1 rounded-[7px] py-2.5 text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--am)" }}
          >
            Create campaign
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
      </form>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px]" style={{ color: "var(--ink3)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}