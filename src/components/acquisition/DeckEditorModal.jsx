import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Mail, ImagePlus, X } from "lucide-react";
import Modal from "../ui/Modal";
import { useToast } from "../../hooks/useToast";
import { buildDefaultDecks, DECK_BG, DECK_ACCENT } from "../../utils/acquisitionDeckTemplates";

// Renders a 16:9 preview of the current slide, styled after the Curious
// Media deck (dark background, bold headline, orange accent bar). If the
// slide has an image, it's shown as a panel alongside the text.
function SlidePreview({ slide, isLast }) {
  const hasImage = Boolean(slide.image);
  return (
    <div
      className="relative flex aspect-video w-full overflow-hidden rounded-[10px]"
      style={{ background: DECK_BG }}
    >
      <div className={"flex flex-col justify-between p-7" + (hasImage ? " w-3/5" : " w-full")}>
        <div className="text-[11px] tracking-[.15em]" style={{ color: "#fff", opacity: 0.6 }}>
          CURIOUS MEDIA
        </div>
        <div>
          <div
            className="mb-3 text-[22px] font-extrabold leading-tight"
            style={{ color: "#fff", fontFamily: "Fraunces, serif" }}
          >
            {slide.heading}
          </div>
          <div className="whitespace-pre-line text-[12px] leading-relaxed" style={{ color: "#E7E7E7" }}>
            {slide.body}
          </div>
          {isLast && slide.footer && (
            <div className="mt-4 text-[11px]" style={{ color: DECK_ACCENT }}>
              {slide.footer}
            </div>
          )}
        </div>
        <div className="h-[3px] w-16 rounded-full" style={{ background: DECK_ACCENT }} />
      </div>
      {hasImage && (
        <div className="w-2/5 flex-shrink-0">
          <img src={slide.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}

export default function DeckEditorModal({ open, onClose, recipients }) {
  const showToast = useToast();
  const decks = useMemo(() => buildDefaultDecks(), []);

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
    const d = decks.find((x) => x.category === majorityCategory) || decks[0];
    return d.slides.map((s) => ({ ...s }));
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [downloaded, setDownloaded] = useState(false);

  function handleCategoryChange(cat) {
    setCategory(cat);
    const d = decks.find((x) => x.category === cat);
    setSlides(d.slides.map((s) => ({ ...s })));
    setSlideIndex(0);
    setDownloaded(false);
  }

  function updateSlideField(field, value) {
    setSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, [field]: value } : s)));
  }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSlideField("image", reader.result);
    reader.readAsDataURL(file);
  }

  const currentSlide = slides[slideIndex];

  async function handleDownload() {
    let PptxGenJS;
    try {
      ({ default: PptxGenJS } = await import("pptxgenjs"));
    } catch {
      showToast("Missing dependency: run `npm install pptxgenjs` in your project, then reload.", false);
      return;
    }

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 10, height: 5.63 });
    pptx.layout = "WIDE";

    slides.forEach((slide, i) => {
      const pSlide = pptx.addSlide();
      pSlide.background = { color: DECK_BG.replace("#", "") };
      const textWidth = slide.image ? 5.6 : 9.2;

      pSlide.addText("CURIOUS MEDIA", {
        x: 0.4, y: 0.3, w: 5, h: 0.4, fontSize: 10, color: "FFFFFF", charSpacing: 2, transparency: 40,
      });
      pSlide.addText(slide.heading, {
        x: 0.4, y: 1.3, w: textWidth, h: 1.3, fontSize: 24, bold: true, color: "FFFFFF", fontFace: "Georgia",
      });
      pSlide.addText(slide.body, {
        x: 0.4, y: 2.6, w: textWidth, h: 2.2, fontSize: 12, color: "E7E7E7", lineSpacingMultiple: 1.3,
      });
      if (i === slides.length - 1 && slide.footer) {
        pSlide.addText(slide.footer, { x: 0.4, y: 5.0, w: textWidth, h: 0.4, fontSize: 11, color: DECK_ACCENT.replace("#", "") });
      }
      pSlide.addShape(pptx.ShapeType.rect, {
        x: 0.4, y: 5.15, w: 0.7, h: 0.04, fill: { color: DECK_ACCENT.replace("#", "") },
      });

      if (slide.image) {
        pSlide.addImage({ data: slide.image, x: 6.2, y: 0, w: 3.8, h: 5.63 });
      }
    });

    await pptx.writeFile({ fileName: `${category.replace(/[/\s]+/g, "-").toLowerCase()}-outreach-deck.pptx` });
    setDownloaded(true);
    showToast("Deck downloaded — attach it in the mail window that opens next.", true);
  }

  function handleOpenMail() {
    const bcc = recipients.map((r) => r.email).filter(Boolean);
    if (bcc.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }
    const subject = `Curious Media × ${category}`;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bcc.join(","))}&su=${encodeURIComponent(subject)}`;
    window.open(url, "_blank");
    if (!downloaded) {
      showToast("Tip: download the deck first so you have the file ready to attach.", true);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Forward Mail — Deck" maxWidth={720}>
      <div className="flex flex-col gap-3 p-1">
        <div className="text-[12px]" style={{ color: "var(--ink3)" }}>
          {recipients.length} creator{recipients.length === 1 ? "" : "s"} selected · {slides.length} slides. Pick a deck, edit
          any slide (text and image), download it, then open mail with everyone in BCC and attach the file yourself.
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Template
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

        <SlidePreview slide={currentSlide} isLast={slideIndex === slides.length - 1} />

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
                title={`Slide ${i + 1}: ${s.heading}`}
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

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Slide {slideIndex + 1} of {slides.length} — heading
          </div>
          <input
            value={currentSlide.heading}
            onChange={(e) => updateSlideField("heading", e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Slide {slideIndex + 1} body
          </div>
          <textarea
            value={currentSlide.body}
            onChange={(e) => updateSlideField("body", e.target.value)}
            rows={5}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
            Slide image (optional)
          </div>
          <div className="flex items-center gap-2">
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px]"
              style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
            >
              <ImagePlus size={13} />
              {currentSlide.image ? "Replace image" : "Add image"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            </label>
            {currentSlide.image && (
              <>
                <img src={currentSlide.image} alt="" className="h-8 w-14 rounded object-cover" style={{ border: "1px solid var(--ln)" }} />
                <button type="button" onClick={() => updateSlideField("image", null)} title="Remove image" style={{ color: "var(--ink3)" }}>
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {slideIndex === slides.length - 1 && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
              Contact footer (last slide only)
            </div>
            <input
              value={currentSlide.footer || ""}
              onChange={(e) => updateSlideField("footer", e.target.value)}
              className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
              style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
            />
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border px-3 py-2 text-[13px]" style={{ borderColor: "var(--ln)" }}>
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[13px] font-medium"
            style={{ borderColor: "var(--am)", color: "var(--am)" }}
          >
            <Download size={13} />
            Download Deck (.pptx)
          </button>
          <button
            type="button"
            onClick={handleOpenMail}
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-white"
            style={{ background: "var(--am)" }}
          >
            <Mail size={13} />
            Open Mail (BCC filled)
          </button>
        </div>
      </div>
    </Modal>
  );
}
