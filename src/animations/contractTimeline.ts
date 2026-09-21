import gsap from "gsap";

/**
 * buildExtractionTimeline
 * -----------------------
 * GSAP timeline for: PDF upload → scan → heading detection → structured output.
 * All selectors are scoped to the passed SVG root for full reusability.
 *
 * Sequence:
 *  1. Upload drop zone fades in
 *  2. PDF thumbnail enters from top
 *  3. PDF drifts down into upload zone
 *  4. Upload border pulses (receipt reaction)
 *  5. PDF + zone fade out; expanded document scales in
 *  6. Scanner line appears and sweeps downward
 *  7. Heading highlights fire as scanner crosses each one,
 *     with extraction cards appearing on the right simultaneously
 *  8. Scanner fades; "+N more" chip appears
 *  9. Completion result pill rises into view
 * 10. Hold, then fade for loop
 */
export function buildExtractionTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const q = (id: string) => svg.querySelector<SVGElement>(id);

  // ── Initial hidden state ────────────────────────────────────────────────
  gsap.set(q("#layer-upload-area"),  { opacity: 0 });
  gsap.set(q("#layer-pdf"),          { opacity: 0, y: -24 });
  gsap.set(q("#layer-document"),     { opacity: 0, scale: 0.93, transformOrigin: "center top" });
  gsap.set(q("#layer-scanner"),      { opacity: 0 });
  gsap.set([q("#scanner-line"), q("#scanner-glow")], { attr: { y1: 138, y2: 138 } });
  gsap.set(q("#layer-highlights"),   { opacity: 1 });
  gsap.set([q("#hl-h1"), q("#hl-h2"), q("#hl-h3"), q("#hl-h4"), q("#hl-h5")], { opacity: 0 });
  gsap.set(q("#layer-extractions"),  { opacity: 1 });
  gsap.set([q("#extract-1"), q("#extract-2"), q("#extract-3"), q("#extract-4"), q("#extract-more")], {
    opacity: 0, x: 14,
  });
  gsap.set(q("#layer-result"),       { opacity: 0, y: 12 });

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    repeat: -1,
    repeatDelay: 2.8,
  });

  // ── 1. Upload zone fades in ─────────────────────────────────────────────
  tl.to(q("#layer-upload-area"), { opacity: 1, duration: 0.55, ease: "power1.out" });

  // ── 2. PDF enters from above ────────────────────────────────────────────
  tl.to(q("#layer-pdf"), { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" }, "+=0.35");

  // ── 3. PDF drifts down into upload zone ─────────────────────────────────
  tl.to(q("#layer-pdf"), { y: 150, duration: 1.0, ease: "power1.inOut" }, "+=0.4");

  // ── 4. Upload border pulses on receipt ──────────────────────────────────
  tl.to(q("#upload-border"), {
    attr: { stroke: "#c0392b" }, duration: 0.22, ease: "none", yoyo: true, repeat: 1,
  }, "<0.4");

  // ── 5. Swap: PDF/zone → expanded document ───────────────────────────────
  tl.to([q("#layer-pdf"), q("#layer-upload-area")], { opacity: 0, duration: 0.4, ease: "power1.in" }, "+=0.15");
  tl.to(q("#layer-document"), { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }, "<0.1");

  // ── 6. Scanner appears and sweeps top → bottom ──────────────────────────
  tl.to(q("#layer-scanner"), { opacity: 1, duration: 0.3 }, "+=0.55");
  // Sweep from y=138 (top of doc content) to y=440 (bottom)
  tl.to([q("#scanner-line"), q("#scanner-glow")], {
    attr: { y1: 440, y2: 440 },
    duration: 3.2,
    ease: "none",
  }, "<");

  // ── 7. Headings highlight + extraction cards appear as scanner crosses ──

  // H1: Executive Summary — scanner ~y=155 → ~9% through 3.2s sweep = 0.29s
  tl.to(q("#hl-h1"),     { opacity: 0.14, duration: 0.28, ease: "power1.out" }, "<0.28");
  tl.to(q("#extract-1"), { opacity: 1, x: 0, duration: 0.42, ease: "power2.out" }, "<");

  // H2: Financial Highlights — scanner ~y=205 → additional ~0.53s
  tl.to(q("#hl-h2"),     { opacity: 0.14, duration: 0.28, ease: "power1.out" }, "<0.55");
  tl.to(q("#extract-2"), { opacity: 1, x: 0, duration: 0.42, ease: "power2.out" }, "<");

  // H3: Risk Factors — scanner ~y=255 → additional ~0.53s
  tl.to(q("#hl-h3"),     { opacity: 0.14, duration: 0.28, ease: "power1.out" }, "<0.55");
  tl.to(q("#extract-3"), { opacity: 1, x: 0, duration: 0.42, ease: "power2.out" }, "<");

  // H4: Market Overview — scanner ~y=305 → additional ~0.53s
  tl.to(q("#hl-h4"),     { opacity: 0.14, duration: 0.28, ease: "power1.out" }, "<0.55");
  tl.to(q("#extract-4"), { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, "<");

  // H5 (Outlook) — quick, just a highlight; card shown as "+1 more" chip
  tl.to(q("#hl-h5"),       { opacity: 0.14, duration: 0.28, ease: "power1.out" }, "<0.55");
  tl.to(q("#extract-more"), { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }, "<");

  // ── 8. Scanner fades out ────────────────────────────────────────────────
  tl.to(q("#layer-scanner"), { opacity: 0, duration: 0.5 }, "+=0.1");

  // ── 9. Result pill rises in ─────────────────────────────────────────────
  tl.to(q("#layer-result"), { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "+=0.3");

  // ── 10. Hold → fade all out ─────────────────────────────────────────────
  tl.to(
    [q("#layer-document"), q("#layer-extractions"), q("#layer-result"), q("#layer-highlights")],
    { opacity: 0, duration: 0.75, ease: "power1.inOut" },
    "+=2.6"
  );

  // Reset for next loop
  tl.call(() => {
    gsap.set(q("#layer-upload-area"), { opacity: 0 });
    gsap.set(q("#layer-pdf"),         { opacity: 0, y: -24 });
    gsap.set(q("#layer-document"),    { opacity: 0, scale: 0.93 });
    gsap.set(q("#layer-scanner"),     { opacity: 0 });
    gsap.set([q("#scanner-line"), q("#scanner-glow")], { attr: { y1: 138, y2: 138 } });
    gsap.set([q("#hl-h1"), q("#hl-h2"), q("#hl-h3"), q("#hl-h4"), q("#hl-h5")], { opacity: 0 });
    gsap.set([q("#extract-1"), q("#extract-2"), q("#extract-3"), q("#extract-4"), q("#extract-more")], {
      opacity: 0, x: 14,
    });
    gsap.set(q("#layer-result"),     { opacity: 0, y: 12 });
    gsap.set(q("#upload-border"),    { attr: { stroke: "#1a1a1a" } });
  });

  return tl;
}
