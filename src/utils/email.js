// Small helper around the mailto:-based "send email" flow used for payment
// details. mailto: only works if the browser/OS has a default mail app
// configured — on a machine without one (or inside some in-app browsers)
// clicking it can silently do nothing, which is easy to mistake for "the
// email button is broken". To make sure the user always has *something*
// usable, this always copies the full draft (to/subject/body) to the
// clipboard as well, so it can be pasted straight into Gmail/Outlook/etc.
// even if the mailto: hand-off didn't launch anything.

import { buildPaymentMailto, formatPaymentInfoLines, primaryPlatform } from "./format";

function buildCredentialsPlainTextDraft({ to, password }) {
  return [
    `To: ${to}`,
    "Subject: Your Curious Media dashboard login",
    "",
    "Hi,",
    "",
    "Your account has been created. You can sign in with:",
    `Email: ${to}`,
    `Password: ${password}`,
    "",
    "Please sign in and keep these details safe.",
  ].join("\n");
}

function buildCredentialsMailto({ to, password }) {
  const subject = "Your Curious Media dashboard login";
  const bodyLines = [
    "Hi,",
    "",
    "Your account has been created. You can sign in with:",
    `Email: ${to}`,
    `Password: ${password}`,
    "",
    "Please sign in and keep these details safe.",
  ];
  const toPart = to ? encodeURIComponent(to) : "";
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  return `mailto:${toPart}?${query}`;
}

/**
 * Opens the admin's mail app with a pre-filled login-credentials draft
 * addressed to the newly created user, and copies the same draft to the
 * clipboard as a fallback (mailto: silently does nothing on a machine
 * with no default mail app configured). Returns
 * { clipboardCopied: boolean } so callers can tailor their confirmation
 * toast.
 */
export async function openCredentialsEmail({ to, password }) {
  const mailto = buildCredentialsMailto({ to, password });

  let clipboardCopied = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(buildCredentialsPlainTextDraft({ to, password }));
      clipboardCopied = true;
    }
  } catch {
    // Clipboard access can be denied (permissions, insecure context, etc.)
    // — that's fine, the mailto hand-off below still gets attempted.
  }

  window.location.href = mailto;

  return { clipboardCopied };
}

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
