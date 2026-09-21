import gsap from "gsap";

/**
 * contractTimeline
 * ----------------
 * Builds and returns the GSAP timeline that drives the contract animation.
 * All selectors are scoped to the provided SVG element so the component is
 * fully reusable and can be mounted multiple times on a page.
 *
 * @param svg  - The root <svg> DOM element (ref.current)
 * @returns    - The GSAP Timeline instance (caller can pause/play/kill)
 */
export function buildContractTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  // Helper: scope querySelector to the svg root
  const q = (selector: string) => svg.querySelector<SVGElement>(selector);
  const qa = (selector: string) =>
    Array.from(svg.querySelectorAll<SVGElement>(selector));

  // ── defaults: everything hidden ─────────────────────────────────────────
  gsap.set(q("#layer-upload-area"),   { opacity: 0 });
  gsap.set(q("#layer-pdf"),           { opacity: 0, y: -20 });
  gsap.set(q("#layer-document"),      { opacity: 0, scale: 0.92, transformOrigin: "center top" });
  gsap.set(q("#layer-scanner"),       { opacity: 0 });
  gsap.set(q("#scanner-line"),        { attr: { y1: 156, y2: 156 } });
  gsap.set(q("#scanner-glow"),        { attr: { y1: 156, y2: 156 } });
  gsap.set(q("#layer-findings"),      { opacity: 1 });
  gsap.set(["#finding-1","#finding-2","#finding-3"].map(id => q(id)), { opacity: 0, x: 12 });
  gsap.set(q("#highlight-indemnity"), { opacity: 0 });
  gsap.set(q("#highlight-liability"), { opacity: 0 });
  gsap.set(q("#highlight-termination"),{ opacity: 0 });
  gsap.set(q("#doc-table"),           { opacity: 0 });
  gsap.set(q("#layer-result"),        { opacity: 0, y: 10 });

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    repeat: -1,
    repeatDelay: 2.5,
  });

  // ── 1. Upload area fades in ─────────────────────────────────────────────
  tl.to(q("#layer-upload-area"), {
    opacity: 1,
    duration: 0.6,
    ease: "power1.out",
  });

  // ── 2. PDF enters from top ──────────────────────────────────────────────
  tl.to(
    q("#layer-pdf"),
    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
    "+=0.3"
  );

  // ── 3. PDF drifts down into upload zone ────────────────────────────────
  tl.to(q("#layer-pdf"), {
    y: 148,           // moves into the centre of the upload box
    duration: 1.0,
    ease: "power1.inOut",
  }, "+=0.4");

  // ── 4. Upload area reacts (subtle border pulse) ─────────────────────────
  tl.to(q("#upload-border"), {
    attr: { stroke: "#c0392b" },
    duration: 0.25,
    ease: "none",
    yoyo: true,
    repeat: 1,
  }, "<0.3");

  // ── 5. PDF + upload area fade out; document expands in ──────────────────
  tl.to(
    [q("#layer-pdf"), q("#layer-upload-area")],
    { opacity: 0, duration: 0.4, ease: "power1.in" },
    "+=0.2"
  );

  tl.to(
    q("#layer-document"),
    { opacity: 1, scale: 1, duration: 0.65, ease: "power2.out" },
    "<0.15"
  );

  // ── 6. Scanner line appears and sweeps top → bottom ─────────────────────
  tl.to(q("#layer-scanner"), { opacity: 1, duration: 0.3 }, "+=0.5");

  // Sweep: move y1/y2 from top of doc (156) to bottom (440)
  tl.to(
    [q("#scanner-line"), q("#scanner-glow")],
    {
      attr: { y1: 440, y2: 440 },
      duration: 2.2,
      ease: "none",
    },
    "<"
  );

  // ── 7. Clause highlights fire as scanner crosses each section ────────────
  // Indemnification section is ~y=230-264 in svg coords → scanner at ~y=235
  tl.to(
    q("#highlight-indemnity"),
    { opacity: 0.12, duration: 0.3, ease: "power1.out" },
    "<0.55"      // 55% through the 2.2 s sweep → ~y=281 px
  );
  tl.to(
    q("#finding-1"),
    { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
    "<"
  );

  // Liability section ~y=295
  tl.to(
    q("#highlight-liability"),
    { opacity: 0.12, duration: 0.3, ease: "power1.out" },
    "<0.45"
  );
  tl.to(
    q("#finding-2"),
    { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
    "<"
  );

  // Termination section ~y=350
  tl.to(
    q("#highlight-termination"),
    { opacity: 0.1, duration: 0.3, ease: "power1.out" },
    "<0.45"
  );
  tl.to(
    q("#finding-3"),
    { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
    "<"
  );

  // ── 8. Scanner fades out; table reveals ─────────────────────────────────
  tl.to(q("#layer-scanner"), { opacity: 0, duration: 0.4 }, "+=0.1");
  tl.to(q("#doc-table"), { opacity: 1, duration: 0.5, ease: "power1.out" }, "<0.1");

  // ── 9. Result pill slides up ─────────────────────────────────────────────
  tl.to(
    q("#layer-result"),
    { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
    "+=0.3"
  );

  // ── 10. Hold, then fade everything out for loop ──────────────────────────
  tl.to(
    [q("#layer-document"), q("#layer-findings"), q("#layer-result")],
    { opacity: 0, duration: 0.7, ease: "power1.inOut" },
    "+=2.8"
  );

  // Reset state for next loop (instant, after fade-out gap)
  tl.call(() => {
    gsap.set(q("#layer-upload-area"),   { opacity: 0 });
    gsap.set(q("#layer-pdf"),           { opacity: 0, y: -20 });
    gsap.set(q("#layer-document"),      { opacity: 0, scale: 0.92 });
    gsap.set(q("#layer-scanner"),       { opacity: 0 });
    gsap.set([q("#scanner-line"), q("#scanner-glow")], { attr: { y1: 156, y2: 156 } });
    gsap.set([q("#finding-1"), q("#finding-2"), q("#finding-3")], { opacity: 0, x: 12 });
    gsap.set(q("#highlight-indemnity"), { opacity: 0 });
    gsap.set(q("#highlight-liability"), { opacity: 0 });
    gsap.set(q("#highlight-termination"),{ opacity: 0 });
    gsap.set(q("#doc-table"),           { opacity: 0 });
    gsap.set(q("#layer-result"),        { opacity: 0, y: 10 });
    gsap.set(q("#upload-border"),       { attr: { stroke: "#1a1a1a" } });
  });

  return tl;
}
