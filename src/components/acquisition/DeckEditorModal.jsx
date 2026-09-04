import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Send, Upload, Trash2, FileText, AlertCircle } from "lucide-react";
import Modal from "../ui/Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchDecks,
  uploadDeck,
  removeDeck,
  downloadDeckBlob,
  deckAsBase64,
  formatFileSize,
} from "../../utils/acquisitionDeckStore";

const DEFAULT_INTRO =
  "Hi,\n\nGreat to connect — please find our deck attached, covering what we do and the results we've driven for creators like you.\n\nWould love to set up a quick call if this looks interesting.\n\nBest,\nCurious Media";

// Mail providers reject very large attachments, and the whole file has to
// travel inside one request to the send function. Past this, warn rather
// than let a send fail halfway through a batch.
const LARGE_DECK_BYTES = 7 * 1024 * 1024;

// Sending one at a time, a short gap keeps well inside the mail
// provider's rate limit instead of tripping it mid-run.
const PER_MAIL_GAP_MS = 600;

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
  const [sendMode, setSendMode] = useState("bcc"); // "bcc" | "individual"
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);

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

  async function handleSend() {
    if (recipientEmails.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }

    setSending(true);
    setProgress(null);
    try {
      // Read the deck once, not once per recipient.
      const attachments = deck ? [{ filename: deck.file_name, content: await deckAsBase64(deck) }] : [];
      const html = introMessage.replace(/\n/g, "<br/>");

      if (sendMode === "bcc") {
        const { error } = await supabase.functions.invoke("send-acquisition-mail", {
          body: { bcc: recipientEmails, subject, html, attachments },
        });
        if (error) throw error;
        showToast(
          `Sent one mail to ${recipientEmails.length} creator${recipientEmails.length === 1 ? "" : "s"} in BCC.`,
          true
        );
        onClose();
        return;
      }

      // One mail each. Failures are counted rather than aborting the run,
      // so one bad address doesn't stop everyone else's mail going out.
      let sent = 0;
      const failed = [];
      for (let i = 0; i < recipientEmails.length; i += 1) {
        const email = recipientEmails[i];
        setProgress({ done: i, total: recipientEmails.length });
        try {
          const { error } = await supabase.functions.invoke("send-acquisition-mail", {
            body: { to: [email], subject, html, attachments },
          });
          if (error) throw error;
          sent += 1;
        } catch (err) {
          console.error(`Failed to send to ${email}:`, err);
          failed.push(email);
        }
        if (i < recipientEmails.length - 1) {
          await new Promise((r) => setTimeout(r, PER_MAIL_GAP_MS));
        }
      }
      setProgress(null);
      showToast(
        failed.length === 0
          ? `Sent ${sent} separate mail${sent === 1 ? "" : "s"}.`
          : `Sent ${sent}, but ${failed.length} failed (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "\u2026" : ""}).`,
        failed.length === 0
      );
      if (failed.length === 0) onClose();
    } catch (err) {
      console.error("Failed to send mail:", err);
      showToast("Failed to send — check the send-acquisition-mail function logs.", false);
    } finally {
      setSending(false);
      setProgress(null);
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
              This deck is {formatFileSize(deck.file_size)}. Large attachments are often bounced — a smaller PDF is
              safer.
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

        {/* Two ways to send — neither is forced. */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            How to send
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              {
                value: "bcc",
                title: "One mail, everyone in BCC",
                note: "Fastest. Nobody sees anyone else's address, but it's one shared mail.",
              },
              {
                value: "individual",
                title: "A separate mail to each",
                note: `${recipientEmails.length} mails, sent one at a time. Each lands as a direct, personal mail.`,
              },
            ].map((opt) => {
              const on = sendMode === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded-[9px] border p-2.5"
                  style={{
                    borderColor: on ? "var(--am)" : "var(--ln)",
                    background: on ? "rgba(30,111,224,.06)" : "var(--panel)",
                  }}
                >
                  <input
                    type="radio"
                    name="send-mode"
                    checked={on}
                    onChange={() => setSendMode(opt.value)}
                    className="mt-[3px] h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
                  />
                  <span>
                    <span className="block text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                      {opt.title}
                    </span>
                    <span className="block text-[11px]" style={{ color: "var(--ink3)" }}>
                      {opt.note}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {progress && (
          <div className="text-[12px]" style={{ color: "var(--ink2)" }}>
            Sending {progress.done + 1} of {progress.total}
            {"\u2026"}
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
            {sending
              ? "Sending\u2026"
              : sendMode === "bcc"
              ? "Send one mail (BCC)"
              : `Send ${recipientEmails.length} separate mail${recipientEmails.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
