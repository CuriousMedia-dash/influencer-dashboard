import { useMemo, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import Modal from "../ui/Modal";
import { buildBrandDashboardUrl } from "../../utils/shareLink";

export default function ShareCampaignModal({ open, onClose, campaign }) {
  const [copied, setCopied] = useState(false);

  // The link is just the campaign's own id now — no snapshot to rebuild,
  // it's the same link every time and always shows live data.
  const shareUrl = useMemo(() => {
    if (!open || !campaign) return "";
    return buildBrandDashboardUrl(campaign.id);
  }, [open, campaign]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      maxWidth={520}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-[7px] border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--ln)",
            color: "var(--ink2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: copied ? "#1E9E5A" : "var(--am)" }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <a
        href={shareUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: "var(--ink2)" }}
      >
        <ExternalLink size={12} />
        Open
      </a>
    </Modal>
  );
}