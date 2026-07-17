import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * A small, deliberate click-to-copy button — meant for exactly the fields
 * that anti-copy (blocking text selection/Ctrl+C app-wide) would
 * otherwise make impossible to copy, like an email address someone
 * actually needs to paste into their mail client.
 */
export default function CopyButton({ value, title = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // button just won't show the checkmark confirmation in that case.
    }
  }

  if (!value) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : title}
      className="flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-[4px] transition-colors"
      style={{ color: copied ? "#2BAE66" : "var(--ink3)" }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}
