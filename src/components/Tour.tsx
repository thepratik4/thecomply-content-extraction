import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  GripVertical,
  Sparkles,
  X,
} from "lucide-react";
import "./Tour.css";

export interface TourStep {
  id: string;
  selectorId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  padding?: number;
  borderRadius?: number;
  actionText?: string;
  onAction?: () => void;
}

interface TourContextType {
  isActive: boolean;
  currentStepIndex: number;
  totalSteps: number;
  startTour: (steps?: TourStep[]) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = (): TourContextType => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
};

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING_DEFAULT = 8;
const RADIUS_DEFAULT = 8;
const CARD_MARGIN = 14;

function calculateCardPosition(
  target: ElementRect,
  preferredPos: "top" | "bottom" | "left" | "right" = "bottom",
  cardSize: { width: number; height: number }
): { top: number; left: number } {
  const vpWidth = window.innerWidth;
  const vpHeight = window.innerHeight;
  const cardWidth = cardSize.width || 360;
  const cardHeight = cardSize.height || 200;

  let top = target.top + target.height + CARD_MARGIN;
  let left = target.left + target.width / 2 - cardWidth / 2;

  switch (preferredPos) {
    case "top":
      top = target.top - cardHeight - CARD_MARGIN;
      left = target.left + target.width / 2 - cardWidth / 2;
      break;
    case "bottom":
      top = target.top + target.height + CARD_MARGIN;
      left = target.left + target.width / 2 - cardWidth / 2;
      break;
    case "left":
      left = target.left - cardWidth - CARD_MARGIN;
      top = target.top + target.height / 2 - cardHeight / 2;
      break;
    case "right":
      left = target.left + target.width + CARD_MARGIN;
      top = target.top + target.height / 2 - cardHeight / 2;
      break;
  }

  // Safety clamps to prevent overflowing the viewport boundaries
  left = Math.max(16, Math.min(left, vpWidth - cardWidth - 16));
  top = Math.max(16, Math.min(top, vpHeight - cardHeight - 16));

  return { top, left };
}

interface TourProviderProps {
  children: React.ReactNode;
  defaultSteps?: TourStep[];
}

export const TourProvider: React.FC<TourProviderProps> = ({
  children,
  defaultSteps = [],
}) => {
  const [steps, setSteps] = useState<TourStep[]>(defaultSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [elementRect, setElementRect] = useState<ElementRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 220,
  });

  const isActive = currentStepIndex >= 0 && currentStepIndex < steps.length;
  const currentStep = isActive ? steps[currentStepIndex] : null;

  // Measure card dimensions whenever step changes
  useEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCardSize({ width: rect.width, height: rect.height });
    }
  }, [currentStepIndex, isActive]);

  // Find & track the target element
  const updateTargetRect = useCallback(() => {
    if (!currentStep) {
      setElementRect(null);
      return;
    }

    const el = document.getElementById(currentStep.selectorId);
    if (el) {
      const r = el.getBoundingClientRect();
      // Auto-scroll element into viewport if outside
      if (r.top < 60 || r.bottom > window.innerHeight - 60) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const updated = el.getBoundingClientRect();
      setElementRect({
        top: updated.top,
        left: updated.left,
        width: updated.width,
        height: updated.height,
      });
    } else {
      // If target element is not in DOM:
      if (currentStepIndex === 0) {
        // Step 1: fall back to compact document bar or loading container when retained work hides tour-dropzone
        const docBar =
          document.querySelector(".compact-document-bar") ||
          document.querySelector(".extract-loading-container");
        if (docBar) {
          const r = docBar.getBoundingClientRect();
          setElementRect({
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
          });
        }
      } else {
        // For Step 2 or others while results are still loading:
        // Highlight the compact document bar / loading progress bar if present
        const docBar =
          document.querySelector(".compact-document-bar") ||
          document.querySelector(".extract-loading-container");
        if (docBar) {
          const r = docBar.getBoundingClientRect();
          setElementRect({
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
          });
        }
        // Retain existing elementRect without shrinking to a fake center box
      }
    }
  }, [currentStep, currentStepIndex]);

  useEffect(() => {
    if (!isActive) return;
    updateTargetRect();

    // Check periodically if target element hasn't appeared yet (e.g. during extraction)
    const checkInterval = setInterval(() => {
      if (currentStep && document.getElementById(currentStep.selectorId)) {
        updateTargetRect();
      }
    }, 200);

    const onResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    const observer = new MutationObserver(() => {
      updateTargetRect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
      observer.disconnect();
    };
  }, [isActive, currentStepIndex, currentStep, updateTargetRect]);

  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const startTour = useCallback(
    (customSteps?: TourStep[]) => {
      lastActiveElementRef.current = document.activeElement as HTMLElement | null;
      if (customSteps && customSteps.length > 0) {
        setSteps(customSteps);
      } else if (defaultSteps.length > 0) {
        setSteps(defaultSteps);
      }
      setCurrentStepIndex(0);
    },
    [defaultSteps]
  );

  const endTour = useCallback(() => {
    setCurrentStepIndex(-1);
    setElementRect(null);
    lastActiveElementRef.current?.focus?.();
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex === 0) {
      // Advancing from Step 1: if document not loaded yet, auto-load sample
      if (!(window as any).__extractai_has_work) {
        window.dispatchEvent(new CustomEvent("extractai:load-sample"));
      }
    }
    if (currentStepIndex >= steps.length - 1) {
      endTour();
      return;
    }
    setCurrentStepIndex(currentStepIndex + 1);
  }, [currentStepIndex, steps.length, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex <= 0) return;
    const nextIdx = currentStepIndex - 1;
    if (nextIdx === 0 && !(window as any).__extractai_has_work) {
      window.dispatchEvent(new CustomEvent("extractai:reset-workspace"));
    }
    setCurrentStepIndex(nextIdx);
  }, [currentStepIndex]);

  // Focus card when step changes or tour becomes active
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => {
      cardRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [isActive, currentStepIndex]);

  // Listen for external trigger to advance tour step (e.g. on file drop or sample load)
  const isAdvancingRef = useRef(false);
  useEffect(() => {
    const handleTourNext = () => {
      if (isActive && currentStepIndex === 0 && !isAdvancingRef.current) {
        isAdvancingRef.current = true;
        setTimeout(() => {
          nextStep();
          setTimeout(() => {
            isAdvancingRef.current = false;
          }, 400);
        }, 80);
      }
    };
    window.addEventListener("extractai:tour-next-step", handleTourNext);
    return () => window.removeEventListener("extractai:tour-next-step", handleTourNext);
  }, [isActive, currentStepIndex, nextStep]);

  // Keyboard navigation: ArrowRight / ArrowLeft / Escape and Tab trap
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endTour();
        return;
      }
      if (e.key === "ArrowRight") {
        nextStep();
        return;
      }
      if (e.key === "ArrowLeft") {
        prevStep();
        return;
      }
      if (e.key === "Tab" && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === cardRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, endTour, nextStep, prevStep]);

  const padding = currentStep?.padding ?? PADDING_DEFAULT;
  const borderRadius = currentStep?.borderRadius ?? RADIUS_DEFAULT;

  const cardPos = useMemo(() => {
    if (!elementRect) {
      return {
        top: Math.max(20, window.innerHeight / 2 - 120),
        left: Math.max(20, window.innerWidth / 2 - 180),
      };
    }
    return calculateCardPosition(elementRect, currentStep?.position, cardSize);
  }, [elementRect, currentStep?.position, cardSize]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStepIndex,
        totalSteps: steps.length,
        startTour,
        endTour,
        nextStep,
        prevStep,
      }}
    >
      {children}

      {/* Render Tour Portal when tour is active */}
      {isActive &&
        createPortal(
          <div className="tour-overlay-portal">
            {/* 4-Panel Backdrop: Leaves cutout 100% open so clicking inside never closes the tour and drag-and-drop works natively */}
            {elementRect ? (
              <>
                {/* Top Panel */}
                <div
                  className="tour-backdrop-panel"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: Math.max(0, elementRect.top - padding),
                  }}
                  onClick={endTour}
                />
                {/* Bottom Panel */}
                <div
                  className="tour-backdrop-panel"
                  style={{
                    top: elementRect.top + elementRect.height + padding,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                  onClick={endTour}
                />
                {/* Left Panel */}
                <div
                  className="tour-backdrop-panel"
                  style={{
                    top: Math.max(0, elementRect.top - padding),
                    left: 0,
                    width: Math.max(0, elementRect.left - padding),
                    height: elementRect.height + padding * 2,
                  }}
                  onClick={endTour}
                />
                {/* Right Panel */}
                <div
                  className="tour-backdrop-panel"
                  style={{
                    top: Math.max(0, elementRect.top - padding),
                    left: elementRect.left + elementRect.width + padding,
                    right: 0,
                    height: elementRect.height + padding * 2,
                  }}
                  onClick={endTour}
                />
              </>
            ) : (
              <div
                className="tour-backdrop-panel"
                style={{ inset: 0 }}
                onClick={endTour}
              />
            )}

            {/* Glowing Border around target */}
            {elementRect && (
              <div
                className="tour-spotlight-border"
                style={{
                  top: elementRect.top - padding,
                  left: elementRect.left - padding,
                  width: elementRect.width + padding * 2,
                  height: elementRect.height + padding * 2,
                  borderRadius: borderRadius + 2,
                }}
              />
            )}

            {/* Step 1: Realistic Desktop PDF File in Top-Right Corner */}
            {currentStep?.id === "step-upload" && elementRect && (() => {
              const fileCardWidth = 140;
              // Place comfortably in top-right corner of the dropzone
              const fileLeft = Math.max(
                elementRect.left + 20,
                elementRect.left + elementRect.width - fileCardWidth - 28
              );
              const fileTop = elementRect.top + 20;

              return (
                <div
                  className="tour-desktop-file"
                  style={{ top: fileTop, left: fileLeft }}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/extractai-sample", "true");
                    e.dataTransfer.setData("text/plain", "AMGN-135003565.pdf");
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!(window as any).__extractai_has_work) {
                      window.dispatchEvent(new CustomEvent("extractai:load-sample"));
                    }
                    window.dispatchEvent(new CustomEvent("extractai:tour-next-step"));
                  }}
                  title="Click to load sample document (or drag into box)"
                >
                  {/* Paper sheet with dog-ear corner */}
                  <div className="tour-file-sheet">
                    <div className="tour-file-corner" />
                    <div className="tour-file-lines">
                      <div className="tour-file-line line-1" />
                      <div className="tour-file-line line-2" />
                      <div className="tour-file-line line-3" />
                    </div>
                    <div className="tour-file-banner">
                      <span>PDF</span>
                    </div>
                    <div className="tour-file-lines lower">
                      <div className="tour-file-line line-4" />
                      <div className="tour-file-line line-5" />
                    </div>
                  </div>

                  {/* Filename and 1-Click hint badge underneath */}
                  <div className="tour-file-meta-wrap">
                    <span className="tour-file-name" title="AMGN-135003565.pdf">
                      AMGN-135003565.pdf
                    </span>
                    <span className="tour-file-hint-badge">
                      <Sparkles size={9} />
                      <span>Click to load • 142 KB</span>
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Floating Callout Card */}
            {currentStep && (
              <div
                ref={cardRef}
                className="tour-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-step-card-title"
                tabIndex={-1}
                style={{
                  top: cardPos.top,
                  left: cardPos.left,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tour-card-header">
                  <div className="tour-card-badge-wrap">
                    <span className="tour-card-step-badge">
                      Step {currentStepIndex + 1} of {steps.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="tour-card-close-btn"
                    onClick={endTour}
                    title="Close tour (Esc)"
                    aria-label="Close tour"
                  >
                    <X size={15} />
                  </button>
                </div>

                <h4 id="tour-step-card-title" className="tour-card-title">{currentStep.title}</h4>
                <p className="tour-card-desc">{currentStep.description}</p>

                {/* Optional Custom Action Button */}
                {currentStep.actionText && currentStep.onAction && (
                  <div className="tour-card-action-extra">
                    <button
                      type="button"
                      className="btn-tour-extra"
                      onClick={() => {
                        currentStep.onAction?.();
                      }}
                    >
                      <Sparkles size={14} />
                      <span>{currentStep.actionText}</span>
                    </button>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="tour-card-footer">
                  <button
                    type="button"
                    className="tour-card-skip-btn"
                    onClick={endTour}
                  >
                    Skip tour
                  </button>

                  <div className="tour-card-nav-btns">
                    {currentStepIndex > 0 && (
                      <button
                        type="button"
                        className="btn-tour-prev"
                        onClick={prevStep}
                      >
                        <ArrowLeft size={13} />
                        <span>Back</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-tour-next"
                      onClick={nextStep}
                    >
                      <span>
                        {currentStepIndex === steps.length - 1
                          ? "Finish Tour"
                          : "Next"}
                      </span>
                      {currentStepIndex === steps.length - 1 ? (
                        <Check size={13} />
                      ) : (
                        <ArrowRight size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </TourContext.Provider>
  );
};
