import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Send, Upload, Trash2, FileText, AlertCircle } from "lucide-react";
import Modal from "../ui/Modal";
import { useToast } from "../../hooks/useToast";
import { openMailDraft } from "../../utils/email";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchDecks,
  uploadDeck,
  removeDeck,
  downloadDeckBlob,
  deckShareUrl,
  formatFileSize,
} from "../../utils/acquisitionDeckStore";

const DEFAULT_INTRO =
  "Hi,\n\nGreat to connect — please find our deck attached, covering what we do and the results we've driven for creators like you.\n\nWould love to set up a quick call if this looks interesting.\n\nBest,\nCurious Media";

// Mail providers reject very large attachments, and the whole file has to
// travel inside one request to the send function. Past this, warn rather
// than let a send fail halfway through a batch.
const LARGE_DECK_BYTES = 7 * 1024 * 1024;

export default function DeckEditorModal({ open, onClose, recipients, categories, resourceKind = "creators" }) {
  const showToast = useToast();
  const { user } = useAuth();

  const majorityCategory = useMemo(() => {
    const counts = {};
    recipients.forEach((r) => {
      if (!r.category) return;
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : categories[0];
  }, [recipients, categories]);

  const [category, setCategory] = useState(majorityCategory);
  const [decks, setDecks] = useState(new Map());
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [busy, setBusy] = useState("");
  const [subject, setSubject] = useState(`Curious Media × ${majorityCategory}`);
  const [introMessage, setIntroMessage] = useState(DEFAULT_INTRO);
  const [sending, setSending] = useState(false);
  // Outlook hand-off works one draft at a time; this tracks how far
  // through the list we are.
  const [outlookQueue, setOutlookQueue] = useState(null);

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true);
    const map = await fetchDecks(resourceKind);
    setDecks(map);
    setLoadingDecks(false);
  }, [resourceKind]);

  useEffect(() => {
    // Deferred a tick so the fetch starts after this render commits
    // rather than during it.
    const t = setTimeout(loadDecks, 0);
    return () => clearTimeout(t);
  }, [loadDecks]);

  const deck = decks.get(category) || null;
  const recipientEmails = recipients.map((r) => r.email).filter(Boolean);

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubject(`Curious Media × ${cat}`);
  }

  async function handleDeckFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload");
    try {
      const saved = await uploadDeck({ kind: resourceKind, category, file, userId: user?.id });
      setDecks((prev) => new Map(prev).set(category, saved));
      showToast(`Deck saved for ${category}. Everyone on the team sees this one now.`, true);
    } catch (err) {
      showToast(`Couldn't save the deck: ${err.message}`, false);
    } finally {
      setBusy("");
    }
  }

  async function handleRemoveDeck() {
    if (!deck) return;
    setBusy("remove");
    try {
      await removeDeck(deck);
      setDecks((prev) => {
        const next = new Map(prev);
        next.delete(category);
        return next;
      });
      showToast(`Deck removed for ${category}.`, true);
    } catch (err) {
      showToast(`Couldn't remove it: ${err.message}`, false);
    } finally {
      setBusy("");
    }
  }

  async function handleDownloadDeck() {
    if (!deck) return;
    setBusy("download");
    try {
      const blob = await downloadDeckBlob(deck);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = deck.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(`Couldn't download it: ${err.message}`, false);
    } finally {
      setBusy("");
    }
  }

  /**
   * Hands the draft to whatever mail app this machine opens mailto:
   * links with — Outlook, in your case. The mail is then sent from your
   * own mailbox, so replies come back to you and a copy lands in your
   * Sent items. A mailto: draft can't carry an attachment, so the deck
   * goes in as a download link instead.
   */
  function openOutlookDraft(to, deckUrl) {
    const body = deckUrl ? introMessage + "\n\nDeck: " + deckUrl : introMessage;
    openMailDraft({ to, subject, body });
  }

  async function handleSend() {
    if (recipientEmails.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }

    setSending(true);
    try {
      // The deck travels as a download link: a mailto: draft can't carry
      // an attachment. Signed for 30 days.
      const deckUrl = deck ? await deckShareUrl(deck) : "";
      // One draft at a time — opening forty mail windows at once would
      // be unusable, so the first opens now and the rest follow as you
      // work through them.
      openOutlookDraft(recipientEmails[0], deckUrl);
      setOutlookQueue({ index: 0, deckUrl });
    } catch (err) {
      showToast(`Couldn't prepare the deck link: ${err.message}`, false);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const deckTooBig = deck && deck.file_size > LARGE_DECK_BYTES;
  const fileAccept =
    ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

  return (
    <Modal open={open} onClose={onClose} title="Forward Mail — Deck" maxWidth={640}>
      <div className="flex flex-col gap-3 p-1">
        <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
          {recipients.length} selected · {recipientEmails.length} with an email on file
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Genre
          </div>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* The genre's deck — one file, saved for the whole team until
            someone replaces it. */}
        <div className="rounded-[10px] border p-3" style={{ borderColor: "var(--ln)", background: "var(--up)" }}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Deck for {category}
          </div>

          {loadingDecks ? (
            <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
              {"Loading\u2026"}
            </div>
          ) : deck ? (
            <div className="flex flex-wrap items-center gap-2">
              <FileText size={15} style={{ color: "var(--am)" }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                  {deck.file_name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--ink3)" }}>
                  {formatFileSize(deck.file_size)} · saved{" "}
                  {deck.uploaded_at ? new Date(deck.uploaded_at).toLocaleDateString() : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadDeck}
                disabled={busy === "download"}
                className="flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
              >
                <Download size={12} />
                Download
              </button>
              <label
                className="flex cursor-pointer items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[12px]"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
              >
                <Upload size={12} />
                {busy === "upload" ? "Saving\u2026" : "Replace"}
                <input
                  type="file"
                  accept={fileAccept}
                  className="hidden"
                  onChange={handleDeckFile}
                  disabled={busy === "upload"}
                />
              </label>
              <button
                type="button"
                onClick={handleRemoveDeck}
                disabled={busy === "remove"}
                title="Remove this genre's deck"
                className="flex items-center gap-1 rounded-[8px] border px-2 py-1.5 text-[12px] disabled:opacity-50"
                style={{ borderColor: "var(--ln)", color: "#E0524B" }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 text-[12px]" style={{ color: "var(--ink3)" }}>
                No deck saved for this genre yet.
              </div>
              <label
                className="flex cursor-pointer items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white"
                style={{ background: "var(--am)" }}
              >
                <Upload size={12} />
                {busy === "upload" ? "Saving\u2026" : "Upload deck"}
                <input
                  type="file"
                  accept={fileAccept}
                  className="hidden"
                  onChange={handleDeckFile}
                  disabled={busy === "upload"}
                />
              </label>
            </div>
          )}

          <div className="mt-2 text-[11px]" style={{ color: "var(--ink3)" }}>
            PDF or PowerPoint. Saved in the backend and shared by everyone — it stays until someone replaces it.
          </div>

          {deckTooBig && (
            <div className="mt-2 flex items-start gap-1.5 text-[11px]" style={{ color: "#E0A23B" }}>
              <AlertCircle size={12} className="mt-[1px] flex-shrink-0" />
              This deck is {formatFileSize(deck.file_size)}. It goes out as a download link rather than an
              attachment, so size isn{"\u2019"}t a problem — but a smaller PDF still opens faster for the creator.
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Email subject
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Email message
          </div>
          <textarea
            value={introMessage}
            onChange={(e) => setIntroMessage(e.target.value)}
            rows={6}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
        </div>

        <div
          className="rounded-[10px] border p-2.5 text-[11px] leading-relaxed"
          style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink3)" }}
        >
          Drafts open in your own mail app, so these go out from your mailbox and replies come back to your inbox.
          The deck travels as a download link rather than an attachment, since a draft can{"\u2019"}t carry a file.
        </div>

        {outlookQueue && (
          <div
            className="rounded-[10px] border p-2.5 text-[12px]"
            style={{ borderColor: "var(--am)", background: "rgba(30,111,224,.06)", color: "var(--ink2)" }}
          >
            <div className="mb-1.5">
              Draft {outlookQueue.index + 1} of {recipientEmails.length} opened
              {" \u2014 "}
              {recipientEmails[outlookQueue.index]}
            </div>
            <div className="flex gap-2">
              {outlookQueue.index < recipientEmails.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = outlookQueue.index + 1;
                    openOutlookDraft(recipientEmails[next], outlookQueue.deckUrl);
                    setOutlookQueue({ ...outlookQueue, index: next });
                  }}
                  className="rounded-[7px] px-3 py-1.5 text-[12px] font-medium text-white"
                  style={{ background: "var(--am)" }}
                >
                  Open next draft
                </button>
              ) : (
                <span className="text-[12px]" style={{ color: "#2BAE66" }}>
                  That was the last one.
                </span>
              )}
              <button
                type="button"
                onClick={() => setOutlookQueue(null)}
                className="rounded-[7px] border px-3 py-1.5 text-[12px]"
                style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-[8px] border px-3 py-2 text-[13px] disabled:opacity-60"
            style={{ borderColor: "var(--ln)" }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || recipientEmails.length === 0}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            style={{ background: "var(--am)" }}
          >
            <Send size={13} />
            {sending ? "Preparing\u2026" : "Open draft in Outlook"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
