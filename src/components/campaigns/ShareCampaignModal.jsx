import { useMemo, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import Modal from "../ui/Modal";
import { buildBrandDashboardUrl } from "../../utils/shareLink";

function TemplateOption({ title, description, url, copiedKey, onCopy, copied }) {
  return (
    <div className="rounded-[10px] border p-3.5" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
      <div className="mb-0.5 text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</div>
      <div className="mb-3 text-[11.5px]" style={{ color: "var(--ink3)" }}>{description}</div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-[7px] border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--ln)",
            background: "var(--panel)",
            color: "var(--ink2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
        <button
          type="button"
          onClick={() => onCopy(copiedKey, url)}
          className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: copied === copiedKey ? "#1E9E5A" : "var(--am)" }}
        >
          {copied === copiedKey ? <Check size={13} /> : <Copy size={13} />}
          {copied === copiedKey ? "Copied" : "Copy link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Open"
          className="flex flex-shrink-0 items-center gap-1 text-xs"
          style={{ color: "var(--ink2)" }}
        >
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

export default function ShareCampaignModal({ open, onClose, campaign }) {
  const [copied, setCopied] = useState(null);

  const simpleUrl = useMemo(() => {
    if (!open || !campaign) return "";
    return buildBrandDashboardUrl(campaign.id, "simple");
  }, [open, campaign]);

  const fullUrl = useMemo(() => {
    if (!open || !campaign) return "";
    return buildBrandDashboardUrl(campaign.id, "full");
  }, [open, campaign]);

  async function handleCopy(key, url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context); the URL
      // is still visible and selectable in the input for manual copy.
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share brand dashboard"
      description="Only your team's admins and invited brand contacts can open this link."
      maxWidth={560}
    >
      <div className="flex flex-col gap-3">
        <TemplateOption
          title="Simple — no costs or budget"
          description="Creator details, execution stage, live links — the brand can still lock creators, they just never see any numbers."
          url={simpleUrl}
          copiedKey="simple"
          onCopy={handleCopy}
          copied={copied}
        />
        <TemplateOption
          title="Full — everything, including costs"
          description="Everything in Simple, plus every cost field: Proposal Cost, Last Cost, Counter Cost, Final Cost, and the live Budget total."
          url={fullUrl}
          copiedKey="full"
          onCopy={handleCopy}
          copied={copied}
        />
      </div>
    </Modal>
  );
}