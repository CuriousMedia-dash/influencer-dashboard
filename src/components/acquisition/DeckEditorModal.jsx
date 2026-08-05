import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Send, ImagePlus, RotateCcw } from "lucide-react";
import Modal from "../ui/Modal";
import { useToast } from "../../hooks/useToast";
import { buildDefaultDecks } from "../../utils/acquisitionDeckTemplates";
import { getSavedDeckSlides, saveDeckSlides, clearSavedDeckSlides } from "../../utils/acquisitionDeckStorage";

const DEFAULT_INTRO =
  "Hi,\n\nGreat to connect — please find our deck attached, covering what we do and the results we've driven for creators like you.\n\nWould love to set up a quick call if this looks interesting.\n\nBest,\nCurious Media";

export default function DeckEditorModal({ open, onClose, recipients, categories }) {
  const showToast = useToast();
  const decks = useMemo(() => buildDefaultDecks(categories), [categories]);

  const majorityCategory = useMemo(() => {
    const counts = {};
    recipients.forEach((r) => {
      if (!r.category) return;
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : decks[0]?.category;
  }, [recipients, decks]);

  const [category, setCategory] = useState(majorityCategory);
  const [slides, setSlides] = useState(() => {
    const saved = getSavedDeckSlides(majorityCategory);
    if (saved) return saved;
    const d = decks.find((x) => x.category === majorityCategory) || decks[0];
    return d.slides.map((s) => ({ ...s }));
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [subject, setSubject] = useState(`Curious Media × ${majorityCategory}`);
  const [introMessage, setIntroMessage] = useState(DEFAULT_INTRO);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function handleCategoryChange(cat) {
    setCategory(cat);
    setSubject(`Curious Media × ${cat}`);
    const saved = getSavedDeckSlides(cat);
    if (saved) {
      setSlides(saved);
    } else {
      const d = decks.find((x) => x.category === cat);
      setSlides(d.slides.map((s) => ({ ...s })));
    }
    setSlideIndex(0);
  }

  function handleResetToDefault() {
    clearSavedDeckSlides(category);
    const d = decks.find((x) => x.category === category);
    setSlides(d.slides.map((s) => ({ ...s })));
    setSlideIndex(0);
    showToast("Reset to the original deck for this category.", true);
  }

  useEffect(() => {
    saveDeckSlides(category, slides);
  }, [category, slides]);

  const currentSlide = slides[slideIndex];

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, image: reader.result } : s)));
    };
    reader.readAsDataURL(file);
  }

  async function buildPptx() {
    let PptxGenJS;
    try {
      ({ default: PptxGenJS } = await import("pptxgenjs"));
    } catch (err) {
      throw new Error(
        `Couldn't load the deck-export library (${err?.message || err}). Try a hard refresh first — if it keeps happening, run \`npm install pptxgenjs\`, commit it, and redeploy.`
      );
    }

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 10, height: 5.625 });
    pptx.layout = "WIDE";

    slides.forEach((slide) => {
      const pSlide = pptx.addSlide();
      pSlide.background = { color: "111111" };
      const resolved = slide.image.startsWith("data:") || slide.image.startsWith("http")
        ? slide.image
        : window.location.origin + slide.image;
      const imgProp = resolved.startsWith("data:") ? { data: resolved } : { path: resolved };
      pSlide.addImage({ ...imgProp, x: 0, y: 0, w: 10, h: 5.625 });
    });

    await pptx.writeFile({ fileName: `${category.replace(/[/\s]+/g, "-").toLowerCase()}-outreach-deck.pptx` });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await buildPptx();
      setDownloaded(true);
      showToast("Deck downloaded — attach it in your mail app once it opens.", true);
    } catch (err) {
      showToast(err.message || "Couldn't build the deck.", false);
    } finally {
      setDownloading(false);
    }
  }

  const bccList = recipients.map((r) => r.email).filter(Boolean);
  const bccText = bccList.join("; ");

  async function handleCopyEmails() {
    if (bccList.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }
    try {
      await navigator.clipboard.writeText(bccText);
      showToast(`Copied ${bccList.length} email${bccList.length === 1 ? "" : "s"}.`, true);
    } catch {
      showToast("Couldn't copy automatically — select the text in the box above and copy it manually (Ctrl+C).", false);
    }
  }

  function handleOpenMail() {
    if (bccList.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }
    const url =
      `mailto:?bcc=${encodeURIComponent(bccList.join(","))}` +
      `&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(introMessage)}`;
    window.location.href = url;
    if (!downloaded) {
      showToast("Opening your mail app — download the deck too so you can attach it there.", true);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Forward Mail — Deck" maxWidth={720}>
      <div className="flex flex-col gap-3 p-1">
        <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
          {recipients.length} creator{recipients.length === 1 ? "" : "s"} selected · {slides.length} slides — this is your
          actual deck, exactly as designed. Replace a slide's image below if you need to, or send as-is.
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
              Template
            </div>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: "var(--ink3)" }}
              title="Discard any swapped slides and restore the original deck for this category"
            >
              <RotateCcw size={11} />
              Reset to original
            </button>
          </div>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          >
            {decks.map((d) => (
              <option key={d.category} value={d.category}>
                {d.category}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-[10px] border" style={{ borderColor: "var(--ln)" }}>
          <img
            src={currentSlide.image}
            alt={`Slide ${slideIndex + 1}`}
            loading="lazy"
            className="w-full object-contain"
            style={{ aspectRatio: "16/9", background: "#111" }}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
            disabled={slideIndex === 0}
            className="flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[12px] disabled:opacity-40"
            style={{ borderColor: "var(--ln)" }}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <div className="flex flex-wrap justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlideIndex(i)}
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: i === slideIndex ? "var(--am)" : "var(--ln)" }}
                title={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
            disabled={slideIndex === slides.length - 1}
            className="flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[12px] disabled:opacity-40"
            style={{ borderColor: "var(--ln)" }}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label
            className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px]"
            style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
          >
            <ImagePlus size={13} />
            Replace slide {slideIndex + 1}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          </label>
        </div>

        <hr style={{ borderColor: "var(--ln)" }} />

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
            Email message (download the deck separately and attach it in your mail app)
          </div>
          <textarea
            value={introMessage}
            onChange={(e) => setIntroMessage(e.target.value)}
            rows={6}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
              Recipient emails ({bccList.length}) — for Bcc
            </div>
            <button type="button" onClick={handleCopyEmails} className="text-[11px] font-medium" style={{ color: "var(--am)" }}>
              Copy
            </button>
          </div>
          <textarea
            readOnly
            value={bccText}
            onFocus={(e) => e.target.select()}
            rows={2}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[12px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--up)", color: "var(--ink2)" }}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border px-3 py-2 text-[13px]" style={{ borderColor: "var(--ln)" }}>
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[13px] font-medium disabled:opacity-60"
            style={{ borderColor: "var(--am)", color: "var(--am)" }}
          >
            <Download size={13} />
            {downloading ? "Building…" : "Download Deck (.pptx)"}
          </button>
          <button
            type="button"
            onClick={handleOpenMail}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-white"
            style={{ background: "var(--am)" }}
          >
            <Send size={13} />
            Open Mail (Bcc auto-filled)
          </button>
        </div>
      </div>
    </Modal>
  );
}