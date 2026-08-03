import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Send, ImagePlus, X, RotateCcw } from "lucide-react";
import Modal from "../ui/Modal";
import { useToast } from "../../hooks/useToast";
import { buildDefaultDecks, DECK_BG, DECK_ACCENT } from "../../utils/acquisitionDeckTemplates";
import { getSavedDeckSlides, saveDeckSlides, clearSavedDeckSlides } from "../../utils/acquisitionDeckStorage";

const BANNER_GREEN = "#C4EE4E";

// Renders a 16:9 preview of the current slide. Each `layout` gets its
// own visual treatment, matching how that slide actually looks in the
// source deck, rather than forcing every slide through one template.
function SlidePreview({ slide, isLast }) {
  const hasImage = Boolean(slide.image);

  if (slide.layout === "cover") {
    return (
      <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-[10px] p-8" style={{ background: DECK_BG }}>
        <div className="text-[11px] tracking-[.15em] text-right" style={{ color: "#fff", opacity: 0.6 }}>CURIOUS MEDIA</div>
        <div>
          <div className="mb-2 text-[28px] font-extrabold leading-tight" style={{ color: "#fff", fontFamily: "Fraunces, serif" }}>
            {slide.heading}
          </div>
          <div className="whitespace-pre-line text-[15px] font-bold leading-snug" style={{ color: "#8FE05B" }}>
            {slide.body}
          </div>
        </div>
        <div className="text-[11px]" style={{ color: "#fff", opacity: 0.7 }}>Swipe Right To Know More...</div>
      </div>
    );
  }

  if (slide.layout === "banner") {
    return (
      <div className="relative flex aspect-video w-full flex-col overflow-hidden rounded-[10px]" style={{ background: DECK_BG }}>
        <div className="px-8 py-6" style={{ background: BANNER_GREEN }}>
          <div className="text-[11px] tracking-[.15em] text-right" style={{ color: "#111", opacity: 0.6 }}>CURIOUS MEDIA</div>
          <div className="text-[26px] font-extrabold" style={{ color: "#111", fontFamily: "Fraunces, serif" }}>{slide.heading}</div>
        </div>
        <div className="flex-1 whitespace-pre-line px-8 py-5 text-[11px] leading-relaxed" style={{ color: "#E7E7E7" }}>
          {slide.body}
        </div>
      </div>
    );
  }

  if (slide.layout === "text-only") {
    return (
      <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-[10px] p-8" style={{ background: DECK_BG }}>
        <div className="text-[11px] tracking-[.15em] text-right" style={{ color: "#fff", opacity: 0.6 }}>CURIOUS MEDIA</div>
        <div>
          <div className="mb-3 text-[22px] font-extrabold leading-tight" style={{ color: "#fff", fontFamily: "Fraunces, serif" }}>{slide.heading}</div>
          <div className="whitespace-pre-line text-[11px] leading-relaxed" style={{ color: "#E7E7E7" }}>{slide.body}</div>
        </div>
        <div className="h-[3px] w-16 rounded-full" style={{ background: DECK_ACCENT }} />
      </div>
    );
  }

  if (slide.layout === "cta-card") {
    return (
      <div className="relative flex aspect-video w-full overflow-hidden rounded-[10px] p-6" style={{ background: DECK_BG }}>
        <div className="flex w-3/5 flex-col justify-center gap-3 pr-4">
          <div className="text-[22px] font-extrabold leading-tight" style={{ color: "#fff", fontFamily: "Fraunces, serif" }}>{slide.heading}</div>
          <div className="whitespace-pre-line rounded-[12px] p-4 text-[11px] leading-relaxed" style={{ background: "#fff", color: "#222" }}>
            {slide.body}
          </div>
        </div>
        {hasImage && (
          <div className="w-2/5 flex-shrink-0 overflow-hidden rounded-[16px]">
            <img src={slide.image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    );
  }

  if (slide.layout === "thank-you") {
    return (
      <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-[10px] p-8" style={{ background: DECK_BG }}>
        <div className="text-[11px] tracking-[.15em] text-right" style={{ color: "#fff", opacity: 0.6 }}>CURIOUS MEDIA</div>
        <div className="text-[34px] font-extrabold leading-tight" style={{ color: "#fff", fontFamily: "Fraunces, serif" }}>{slide.heading}</div>
        {slide.footer && (
          <div className="flex gap-6 text-[10px]" style={{ color: DECK_ACCENT }}>
            {slide.footer.split("·").map((part, i) => (
              <span key={i}>{part.trim()}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // default: "photo-side" — heading + body left, photo/screenshot right
  return (
    <div className="relative flex aspect-video w-full overflow-hidden rounded-[10px]" style={{ background: DECK_BG }}>
      <div className={"flex flex-col justify-between p-7" + (hasImage ? " w-3/5" : " w-full")}>
        <div className="text-[11px] tracking-[.15em]" style={{ color: "#fff", opacity: 0.6 }}>CURIOUS MEDIA</div>
        <div>
          {slide.overline && (
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#fff" }}>{slide.overline}</div>
          )}
          <div className="mb-2 text-[20px] font-extrabold leading-tight" style={{ color: slide.overline ? DECK_ACCENT : "#fff", fontFamily: "Fraunces, serif" }}>
            {slide.heading}
          </div>
          <div className="whitespace-pre-line text-[11px] leading-relaxed" style={{ color: "#E7E7E7" }}>{slide.body}</div>
          {isLast && slide.footer && (
            <div className="mt-4 text-[11px]" style={{ color: DECK_ACCENT }}>{slide.footer}</div>
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

const DEFAULT_INTRO =
  "Hi,\n\nGreat to connect — please find our deck attached, covering what we do and the results we've driven for creators like you.\n\nWould love to set up a quick call if this looks interesting.\n\nBest,\nCurious Media";

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
    showToast("Reset to the default template for this category.", true);
  }

  // Every edit — text or image — is saved immediately, so it's still
  // there next time this category is opened, until reset above.
  useEffect(() => {
    saveDeckSlides(category, slides);
  }, [category, slides]);

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

  // Builds the .pptx in-browser. `outputType` controls whether it triggers
  // a file download (for the "Download" button) or hands back the raw
  // bytes to attach to an outgoing email (for "Send").
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
    pptx.defineLayout({ name: "WIDE", width: 10, height: 5.63 });
    pptx.layout = "WIDE";
    const BANNER_GREEN_HEX = BANNER_GREEN.replace("#", "");
    const ACCENT_HEX = DECK_ACCENT.replace("#", "");
    const BG_HEX = DECK_BG.replace("#", "");

    function addImageProp(pSlide, image, opts) {
      const imgProp = image.startsWith("data:") ? { data: image } : { path: image };
      pSlide.addImage({ ...imgProp, ...opts });
    }

    slides.forEach((slide, i) => {
      const pSlide = pptx.addSlide();
      const isLastSlide = i === slides.length - 1;

      if (slide.layout === "banner") {
        pSlide.background = { color: BG_HEX };
        pSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.7, fill: { color: BANNER_GREEN_HEX } });
        pSlide.addText("CURIOUS MEDIA", { x: 5, y: 0.25, w: 4.6, h: 0.3, fontSize: 9, color: "111111", align: "right" });
        pSlide.addText(slide.heading, { x: 0.4, y: 0.6, w: 9.2, h: 0.9, fontSize: 26, bold: true, color: "111111", fontFace: "Georgia" });
        pSlide.addText(slide.body, { x: 0.4, y: 1.95, w: 9.2, h: 3.5, fontSize: 12, color: "E7E7E7", lineSpacingMultiple: 1.3 });
        return;
      }

      if (slide.layout === "cta-card") {
        pSlide.background = { color: BG_HEX };
        pSlide.addText(slide.heading, { x: 0.4, y: 0.5, w: 5.6, h: 1, fontSize: 26, bold: true, color: "FFFFFF", fontFace: "Georgia" });
        pSlide.addShape(pptx.ShapeType.roundRect, { x: 0.4, y: 1.6, w: 5.6, h: 3.6, fill: { color: "FFFFFF" }, rectRadius: 0.1 });
        pSlide.addText(slide.body, { x: 0.6, y: 1.8, w: 5.2, h: 3.2, fontSize: 11, color: "222222", lineSpacingMultiple: 1.3 });
        if (slide.image) addImageProp(pSlide, slide.image, { x: 6.2, y: 0, w: 3.8, h: 5.63 });
        return;
      }

      if (slide.layout === "thank-you") {
        pSlide.background = { color: BG_HEX };
        pSlide.addText("CURIOUS MEDIA", { x: 5, y: 0.3, w: 4.6, h: 0.3, fontSize: 9, color: "FFFFFF", align: "right" });
        pSlide.addText(slide.heading, { x: 0.4, y: 2, w: 9.2, h: 1.5, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Georgia" });
        if (slide.footer) {
          pSlide.addText(slide.footer.split("·").map((p) => p.trim()).join("      "), {
            x: 0.4, y: 5.0, w: 9.2, h: 0.4, fontSize: 11, color: ACCENT_HEX,
          });
        }
        return;
      }

      if (slide.layout === "cover") {
        pSlide.background = { color: BG_HEX };
        pSlide.addText("CURIOUS MEDIA", { x: 5, y: 0.3, w: 4.6, h: 0.3, fontSize: 10, color: "FFFFFF", align: "right" });
        pSlide.addText(slide.heading, { x: 0.4, y: 1.4, w: 9.2, h: 1.6, fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Georgia" });
        pSlide.addText(slide.body, { x: 0.4, y: 3.1, w: 9.2, h: 1.2, fontSize: 16, bold: true, color: "8FE05B", lineSpacingMultiple: 1.3 });
        pSlide.addText("Swipe Right To Know More...", { x: 0.4, y: 5.0, w: 5, h: 0.4, fontSize: 11, color: "FFFFFF" });
        return;
      }

      // "photo-side" and "text-only" share the same base layout, just
      // with or without the image column.
      pSlide.background = { color: BG_HEX };
      const textWidth = slide.image ? 5.6 : 9.2;
      pSlide.addText("CURIOUS MEDIA", { x: 0.4, y: 0.3, w: 5, h: 0.4, fontSize: 10, color: "FFFFFF", charSpacing: 2, transparency: 40 });

      let headingY = 1.3;
      if (slide.overline) {
        pSlide.addText(slide.overline, { x: 0.4, y: 1.05, w: textWidth, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF" });
        headingY = 1.35;
      }
      pSlide.addText(slide.heading, {
        x: 0.4, y: headingY, w: textWidth, h: 1.1, fontSize: 22, bold: true,
        color: slide.overline ? ACCENT_HEX : "FFFFFF", fontFace: "Georgia",
      });
      pSlide.addText(slide.body, { x: 0.4, y: headingY + 1.2, w: textWidth, h: 2.6, fontSize: 12, color: "E7E7E7", lineSpacingMultiple: 1.3 });
      if (isLastSlide && slide.footer) {
        pSlide.addText(slide.footer, { x: 0.4, y: 5.0, w: textWidth, h: 0.4, fontSize: 11, color: ACCENT_HEX });
      }
      pSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 5.15, w: 0.7, h: 0.04, fill: { color: ACCENT_HEX } });

      if (slide.image) addImageProp(pSlide, slide.image, { x: 6.2, y: 0, w: 3.8, h: 5.63 });
    });

    await pptx.writeFile({ fileName: `${category.replace(/[/\s]+/g, "-").toLowerCase()}-outreach-deck.pptx` });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await buildPptx();
      setDownloaded(true);
      showToast("Deck downloaded — attach it in Outlook once it opens.", true);
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
    } catch (err) {
      showToast("Couldn't copy automatically — select the text in the box above and copy it manually (Ctrl+C).", false);
    }
  }

  function handleOpenOutlook() {
    if (bccList.length === 0) {
      showToast("None of the selected creators have an email on file.", false);
      return;
    }
    // Outlook's office.com web deeplink doesn't reliably honor its own
    // bcc param — mailto: is the actual standard for this and every
    // mail client (Outlook desktop or web, if set as your system's
    // default mail handler) fills Bcc from it correctly.
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
          {recipients.length} creator{recipients.length === 1 ? "" : "s"} selected · {slides.length} slides. Edit the deck,
          then download it and open Outlook — attach the file there and send from your own account.
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
              title="Discard your edits and restore the default template for this category"
            >
              <RotateCcw size={11} />
              Reset to default
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
            Email message (download the deck separately and attach it in Outlook)
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
            onClick={handleOpenOutlook}
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
