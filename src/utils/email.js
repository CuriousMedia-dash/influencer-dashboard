// Small helper around the mailto:-based "send email" flow used for payment
// details. mailto: only works if the browser/OS has a default mail app
// configured — on a machine without one (or inside some in-app browsers)
// clicking it can silently do nothing, which is easy to mistake for "the
// email button is broken". To make sure the user always has *something*
// usable, this always copies the full draft (to/subject/body) to the
// clipboard as well, so it can be pasted straight into Gmail/Outlook/etc.
// even if the mailto: hand-off didn't launch anything.

import { buildPaymentMailto, formatPaymentInfoLines, primaryPlatform } from "./format";

function buildPlainTextDraft({ to, creator, campaignName, amount, paymentInfo }) {
  const lines = [
    to ? `To: ${to}` : null,
    `Subject: Payment details — ${creator?.name || "Creator"} — ${campaignName || ""}`.trim(),
    "",
    `Creator: ${creator?.name || "—"}`,
    `Phone: ${creator?.phone || "—"}`,
    `Platform: ${creator?.platform || primaryPlatform(creator) || "—"}`,
    `Campaign: ${campaignName || "—"}`,
    `Payment amount: ${amount || "—"}`,
    "",
    ...formatPaymentInfoLines(paymentInfo),
  ].filter((l) => l !== null);
  return lines.join("\n");
}

/**
 * Opens the user's mail app with a pre-filled payment-details draft, and
 * copies the same draft to the clipboard as a fallback. Returns
 * { clipboardCopied: boolean } so callers can tailor the confirmation
 * toast (e.g. mention the clipboard backup only when it actually worked).
 */
export async function openPaymentEmail({ to, creator, campaignName, amount, paymentInfo }) {
  const mailto = buildPaymentMailto({ to, creator, campaignName, amount, paymentInfo });

  let clipboardCopied = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(
        buildPlainTextDraft({ to, creator, campaignName, amount, paymentInfo })
      );
      clipboardCopied = true;
    }
  } catch {
    // Clipboard access can be denied (permissions, insecure context, etc.)
    // — that's fine, the mailto hand-off below still gets attempted.
  }

  // Give the mail app a moment to take over; done via location change.
  window.location.href = mailto;

  return { clipboardCopied };
}
