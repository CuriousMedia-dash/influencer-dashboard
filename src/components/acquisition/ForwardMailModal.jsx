import { useMemo, useState } from "react";
import { X, Paperclip, Send } from "lucide-react";
import Modal from "../ui/Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import { buildDefaultTemplates } from "../../utils/acquisitionMailTemplates";

// Sends through a Supabase Edge Function (see
// supabase/functions/send-acquisition-mail/index.ts) so the actual Resend
// API key never touches the browser. Deploy that function and set
// RESEND_API_KEY + RESEND_FROM as its secrets before this button will work.

export default function ForwardMailModal({ open, onClose, recipients }) {
  const showToast = useToast();
  const templates = useMemo(() => buildDefaultTemplates(), []);

  const majorityCategory = useMemo(() => {
    const counts = {};
    recipients.forEach((r) => {
      if (!r.category) return;
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : templates[0]?.category;
  }, [recipients, templates]);

  const [templateCategory, setTemplateCategory] = useState(majorityCategory);
  const activeTemplate = templates.find((t) => t.category === templateCategory) || templates[0];

  const [subject, setSubject] = useState(activeTemplate?.subject || "");
  const [body, setBody] = useState(activeTemplate?.body || "");
  const [attachments, setAttachments] = useState([]); // [{name, dataUrl}]
  const [sending, setSending] = useState(false);

  function handleTemplateChange(cat) {
    setTemplateCategory(cat);
    const t = templates.find((x) => x.category === cat);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const read = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, dataUrl: reader.result });
        reader.readAsDataURL(file);
      });
    const results = await Promise.all(files.map(read));
    setAttachments((prev) => [...prev, ...results]);
  }

  function removeAttachment(name) {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }

  async function handleSend() {
    const bcc = recipients.map((r) => r.email).filter(Boolean);
    if (bcc.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-acquisition-mail", {
        body: {
          bcc,
          subject,
          html: body.replace(/\n/g, "<br/>"),
          attachments: attachments.map((a) => ({ filename: a.name, content: a.dataUrl.split(",")[1] })),
        },
      });
      if (error) throw error;
      showToast(`Sent to ${bcc.length} creator${bcc.length === 1 ? "" : "s"}.`, true);
      onClose();
    } catch (err) {
      console.error("Failed to send mail:", err);
      showToast("Failed to send — check the send-acquisition-mail function logs.", false);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Forward Mail" maxWidth={620}>
      <div className="flex flex-col gap-3 p-1">
        <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
          Sending to {recipients.length} creator{recipients.length === 1 ? "" : "s"} (BCC), picked from the Mail column.
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Template
          </div>
          <select
            value={templateCategory}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          >
            {templates.map((t) => (
              <option key={t.category} value={t.category}>
                {t.category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Subject
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
            Body
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
        </div>

        <div>
          <label
            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px]"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            <Paperclip size={13} />
            Attach screenshot(s)
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </label>
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <span
                  key={a.name}
                  className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]"
                  style={{ borderColor: "var(--ln)" }}
                >
                  {a.name}
                  <button type="button" onClick={() => removeAttachment(a.name)}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border px-3 py-2 text-[13px]" style={{ borderColor: "var(--ln)" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            style={{ background: "var(--am)" }}
          >
            <Send size={13} />
            {sending ? "Sending…" : "Send Mail"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
