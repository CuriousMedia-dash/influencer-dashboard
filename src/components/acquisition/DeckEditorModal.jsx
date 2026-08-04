import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Send, ImagePlus, X, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../hooks/useToast";
import { buildDefaultDecks } from "../../utils/acquisitionDeckTemplates";
import { getSavedDeckSlides, saveDeckSlides, clearSavedDeckSlides } from "../../utils/acquisitionDeckStorage";

const BANNER_GREEN = "#C4EE4E";
const HEADING_FONT = "'League Spartan', 'Segoe UI', Arial, sans-serif";

// Approximate text/photo zones per layout, as fractions of the slide
// (matched by eye against the real deck pages saved as backgrounds).
// Not pixel-exact — send a screenshot of anything misaligned and it can
// be tuned per-slide.
const ZONES = {
  cover: {
    heading: { x: 0.03, y: 0.17, w: 0.94, h: 0.42, color: "#fff", size: 28 },
    body: { x: 0.03, y: 0.60, w: 0.94, h: 0.22, color: "#8FE05B", size: 15, bold: true },
  },
  "photo-side": {
    heading: { x: 0.03, y: 0.10, w: 0.54, h: 0.20, color: "#fff", size: 20 },
    body: { x: 0.03, y: 0.31, w: 0.54, h: 0.62, color: "#E7E7E7", size: 11.5 },
    photo: { x: 0.60, y: 0.0, w: 0.40, h: 1.0 },
  },
  banner: {
    heading: { x: 0.02, y: 0.16, w: 0.94, h: 0.19, color: "#111", size: 24 },
    body: { x: 0.02, y: 0.40, w: 0.94, h: 0.55, color: "#E7E7E7", size: 12 },
  },
  "text-only": {
    heading: { x: 0.02, y: 0.03, w: 0.96, h: 0.12, color: "#fff", size: 20 },
    body: { x: 0.02, y: 0.17, w: 0.96, h: 0.80, color: "#E7E7E7", size: 12 },
  },
  "cta-card": {
    heading: { x: 0.03, y: 0.04, w: 0.46, h: 0.14, color: "#fff", size: 22 },
    body: { x: 0.03, y: 0.20, w: 0.46, h: 0.72, color: "#222", size: 11.5 },
    photo: { x: 0.52, y: 0.0, w: 0.48, h: 1.0 },
  },
  "thank-you": {
    heading: { x: 0.03, y: 0.26, w: 0.90, h: 0.30, color: "#fff", size: 34 },
    footer: { x: 0.03, y: 0.86, w: 0.94, h: 0.10, color: "#F5A623", size: 11 },
  },
};

const pct = (v) => `${v * 100}%`;

// Renders the slide as its real page image (exact fidelity) with
// editable heading/body/footer/photo positioned on top, in the zone
// that was painted over on that background.
function SlidePreview({ slide, isLast }) {
  const zones = ZONES[slide.layout] || ZONES["photo-side"];
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-[10px]"
      style={{ backgroundImage: `url(${slide.background})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {slide.image && zones.photo && (
        <img
          src={slide.image}
          alt=""
          className="absolute object-cover"
          style={{ left: pct(zones.photo.x), top: pct(zones.photo.y), width: pct(zones.photo.w), height: pct(zones.photo.h) }}
        />
      )}
      {zones.heading && (
        <div
          className="absolute overflow-hidden whitespace-pre-line font-extrabold leading-tight"
          style={{
            left: pct(zones.heading.x), top: pct(zones.heading.y), width: pct(zones.heading.w), height: pct(zones.heading.h),
            color: zones.heading.color, fontSize: zones.heading.size, fontFamily: HEADING_FONT,
          }}
        >
          {slide.overline && (
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: zones.heading.color, opacity: 0.85 }}>
              {slide.overline}
            </div>
          )}
          {slide.heading}
        </div>
      )}
      {zones.body && (
        <div
          className="absolute overflow-hidden whitespace-pre-line leading-relaxed"
          style={{
            left: pct(zones.body.x), top: pct(zones.body.y), width: pct(zones.body.w), height: pct(zones.body.h),
            color: zones.body.color, fontSize: zones.body.size, fontWeight: zones.body.bold ? 700 : 400,
          }}
        >
          {slide.body}
        </div>
      )}
      {isLast && zones.footer && slide.footer && (
        <div
          className="absolute overflow-hidden whitespace-pre-line"
          style={{
            left: pct(zones.footer.x), top: pct(zones.footer.y), width: pct(zones.footer.w), height: pct(zones.footer.h),
            color: zones.footer.color, fontSize: zones.footer.size,
          }}
        >
          {slide.footer}
        </div>
      )}
    </div>
  );
}

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
    showToast("Reset to the default template for this category.", true);
  }

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

  // ── AI: reframe heading/body text (Gemini via edge function) ──
  const [reframing, setReframing] = useState(null); // "heading" | "body" | null
  const [reframeSuggestion, setReframeSuggestion] = useState(null); // { field, text } | null

  useEffect(() => {
    setReframeSuggestion(null);
  }, [slideIndex, category]);

  async function handleReframe(field) {
    const text = currentSlide[field];
    if (!text || !text.trim()) return;
    setReframing(field);
    setReframeSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("reframe-text", {
        body: { text, fieldType: field },
      });
      if (error) throw error;
      setReframeSuggestion({ field, text: data.text });
    } catch (err) {
      showToast(err.message || "Couldn't reframe that text — check the reframe-text function is deployed.", false);
    } finally {
      setReframing(null);
    }
  }

  function applyReframe() {
    if (!reframeSuggestion) return;
    updateSlideField(reframeSuggestion.field, reframeSuggestion.text);
    setReframeSuggestion(null);
  }

  // ── AI: generate a replacement image (Pollinations — free, no key) ──
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);

  function handleGenerateImage() {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    const seed = Date.now();
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=900&height=507&nologo=true&seed=${seed}`;
    setGeneratedImageUrl(url);
  }

  function useGeneratedImage() {
    updateSlideField("image", generatedImageUrl);
    setGeneratedImageUrl(null);
    setImagePrompt("");
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
    const SLIDE_W = 10;
    const SLIDE_H = 5.625;
    pptx.defineLayout({ name: "WIDE", width: SLIDE_W, height: SLIDE_H });
    pptx.layout = "WIDE";

    function addImageProp(pSlide, image, opts) {
      // pptxgenjs needs a fully-qualified URL to actually fetch and embed
      // an image — a relative path like "/deck-images/..." silently
      // fails, which is exactly what produced the all-white deck.
      const resolved = image.startsWith("data:") || image.startsWith("http") ? image : window.location.origin + image;
      const imgProp = resolved.startsWith("data:") ? { data: resolved } : { path: resolved };
      pSlide.addImage({ ...imgProp, ...opts });
    }

    slides.forEach((slide, i) => {
      const pSlide = pptx.addSlide();
      pSlide.background = { color: "111111" }; // fallback if the background image fails to load for any reason
      const isLastSlide = i === slides.length - 1;
      const zones = ZONES[slide.layout] || ZONES["photo-side"];

      // The real page image, full-bleed — this is what makes it exact.
      addImageProp(pSlide, slide.background, { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });

      // Optional replacement photo, positioned over the original photo's zone.
      if (slide.image && zones.photo) {
        addImageProp(pSlide, slide.image, {
          x: zones.photo.x * SLIDE_W, y: zones.photo.y * SLIDE_H,
          w: zones.photo.w * SLIDE_W, h: zones.photo.h * SLIDE_H,
        });
      }

      if (zones.heading) {
        const z = zones.heading;
        pSlide.addText(slide.heading, {
          x: z.x * SLIDE_W, y: z.y * SLIDE_H, w: z.w * SLIDE_W, h: z.h * SLIDE_H,
          fontSize: z.size, bold: true, color: z.color.replace("#", ""), fontFace: "Arial",
        });
      }
      if (zones.body) {
        const z = zones.body;
        pSlide.addText(slide.body, {
          x: z.x * SLIDE_W, y: z.y * SLIDE_H, w: z.w * SLIDE_W, h: z.h * SLIDE_H,
          fontSize: z.size, bold: Boolean(z.bold), color: z.color.replace("#", ""), lineSpacingMultiple: 1.25,
        });
      }
      if (isLastSlide && zones.footer && slide.footer) {
        const z = zones.footer;
        pSlide.addText(slide.footer, {
          x: z.x * SLIDE_W, y: z.y * SLIDE_H, w: z.w * SLIDE_W, h: z.h * SLIDE_H,
          fontSize: z.size, color: z.color.replace("#", ""),
        });
      }
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
          {recipients.length} creator{recipients.length === 1 ? "" : "s"} selected · {slides.length} slides. Edit the deck,
          then download it and open your mail app — attach the file there and send from your own account.
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
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
              Slide {slideIndex + 1} of {slides.length} — heading
            </div>
            <button
              type="button"
              onClick={() => handleReframe("heading")}
              disabled={reframing === "heading"}
              className="flex items-center gap-1 text-[11px] font-medium disabled:opacity-50"
              style={{ color: "var(--am)" }}
            >
              {reframing === "heading" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Reframe with AI
            </button>
          </div>
          <input
            value={currentSlide.heading}
            onChange={(e) => updateSlideField("heading", e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
          {reframeSuggestion?.field === "heading" && (
            <div className="mt-1.5 rounded-[8px] border p-2" style={{ borderColor: "var(--am)", background: "var(--up)" }}>
              <div className="mb-1.5 text-[12px]" style={{ color: "var(--ink)" }}>{reframeSuggestion.text}</div>
              <div className="flex gap-2">
                <button type="button" onClick={applyReframe} className="rounded-md px-2 py-1 text-[11px] font-semibold text-white" style={{ background: "var(--am)" }}>
                  Use this
                </button>
                <button type="button" onClick={() => setReframeSuggestion(null)} className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                  Keep mine
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: "var(--ink3)" }}>
              Slide {slideIndex + 1} body
            </div>
            <button
              type="button"
              onClick={() => handleReframe("body")}
              disabled={reframing === "body"}
              className="flex items-center gap-1 text-[11px] font-medium disabled:opacity-50"
              style={{ color: "var(--am)" }}
            >
              {reframing === "body" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Reframe with AI
            </button>
          </div>
          <textarea
            value={currentSlide.body}
            onChange={(e) => updateSlideField("body", e.target.value)}
            rows={5}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
          />
          {reframeSuggestion?.field === "body" && (
            <div className="mt-1.5 rounded-[8px] border p-2" style={{ borderColor: "var(--am)", background: "var(--up)" }}>
              <div className="mb-1.5 whitespace-pre-line text-[12px]" style={{ color: "var(--ink)" }}>{reframeSuggestion.text}</div>
              <div className="flex gap-2">
                <button type="button" onClick={applyReframe} className="rounded-md px-2 py-1 text-[11px] font-semibold text-white" style={{ background: "var(--am)" }}>
                  Use this
                </button>
                <button type="button" onClick={() => setReframeSuggestion(null)} className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                  Keep mine
                </button>
              </div>
            </div>
          )}
        </div>

        {ZONES[currentSlide.layout]?.photo && (
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

          <div className="mt-2 flex items-center gap-2">
            <input
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Or describe an image to generate…"
              className="flex-1 rounded-[8px] border px-2.5 py-1.5 text-[12px]"
              style={{ borderColor: "var(--ln)", background: "var(--panel)" }}
            />
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || generatingImage}
              className="flex items-center gap-1 whitespace-nowrap rounded-[8px] border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50"
              style={{ borderColor: "var(--am)", color: "var(--am)" }}
            >
              <Sparkles size={11} />
              Generate
            </button>
          </div>
          {generatedImageUrl && (
            <div className="mt-1.5 flex items-center gap-2 rounded-[8px] border p-2" style={{ borderColor: "var(--am)", background: "var(--up)" }}>
              <img
                src={generatedImageUrl}
                alt="Generated preview"
                className="h-16 w-28 rounded object-cover"
                onLoad={() => setGeneratingImage(false)}
                onError={() => {
                  setGeneratingImage(false);
                  showToast("Image generation failed — try a different prompt.", false);
                  setGeneratedImageUrl(null);
                }}
              />
              {generatingImage ? (
                <span className="text-[11px]" style={{ color: "var(--ink3)" }}>Generating…</span>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={useGeneratedImage} className="rounded-md px-2 py-1 text-[11px] font-semibold text-white" style={{ background: "var(--am)" }}>
                    Use this image
                  </button>
                  <button type="button" onClick={handleGenerateImage} className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

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
