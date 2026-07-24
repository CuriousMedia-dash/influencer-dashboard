import { useMemo, useState, useEffect } from "react";
import { Copy, Check, ExternalLink, ChevronLeft } from "lucide-react";
import Modal from "../ui/Modal";
import { buildBrandDashboardUrl } from "../../utils/shareLink";

const TEMPLATES = [
  {
    key: "simple",
    title: "Simple",
    subtitle: "No costs or budget",
    description: "Creator details, execution stage, live links. The brand can still lock creators — they just never see any numbers.",
  },
  {
    key: "full",
    title: "Full",
    subtitle: "Everything, including costs",
    description: "Proposal Cost, Counter Cost, Last Cost, Final Cost, and the live Budget total, on top of everything in Simple.",
  },
];

export default function ShareCampaignModal({ open, onClose, campaign }) {
  const [chosen, setChosen] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setChosen(null);
  }, [open]);

  const url = useMemo(() => {
    if (!open || !campaign || !chosen) return "";
    return buildBrandDashboardUrl(campaign.id, chosen);
  }, [open, campaign, chosen]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
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
      maxWidth={480}
    >
      {!chosen ? (
        <div className="flex flex-col gap-2.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setChosen(t.key)}
              className="rounded-[10px] border p-3.5 text-left transition-colors"
              style={{ borderColor: "var(--ln)", background: "var(--up)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--am)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ln)"; }}
            >
              <div className="mb-0.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{t.title}</span>
                <span className="text-[11px]" style={{ color: "var(--ink3)" }}>{t.subtitle}</span>
              </div>
              <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--ink3)" }}>{t.description}</div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setChosen(null)}
            className="mb-3 flex items-center gap-1 text-[11.5px] font-medium"
            style={{ color: "var(--ink2)" }}
          >
            <ChevronLeft size={13} />
            Choose a different template
          </button>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
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
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "var(--ink2)" }}
          >
            <ExternalLink size={12} />
            Open
          </a>
        </div>
      )}
    </Modal>
  );
}