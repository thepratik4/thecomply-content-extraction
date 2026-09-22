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
      // If target element is not in DOM (e.g. results not yet visible), center spotlight
      setElementRect({
        top: window.innerHeight / 2 - 120,
        left: window.innerWidth / 2 - 200,
        width: 400,
        height: 240,
      });
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;
    updateTargetRect();

    // Re-check after 350ms in case DOM finished animating/expanding
    const t = setTimeout(updateTargetRect, 350);

    const onResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [isActive, currentStepIndex, updateTargetRect]);

  const startTour = useCallback(
    (customSteps?: TourStep[]) => {
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
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev >= steps.length - 1) {
        return -1;
      }
      return prev + 1;
    });
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation: ArrowRight / ArrowLeft / Escape
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endTour();
      } else if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
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
          <div className="tour-overlay-portal" role="dialog" aria-modal="true">
            {/* SVG Mask Spotlight Cutout */}
            <svg
              className="tour-svg-backdrop"
              xmlns="http://www.w3.org/2000/svg"
              onClick={endTour}
            >
              <defs>
                <mask id="tour-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {elementRect && (
                    <rect
                      x={elementRect.left - padding}
                      y={elementRect.top - padding}
                      width={elementRect.width + padding * 2}
                      height={elementRect.height + padding * 2}
                      rx={borderRadius}
                      ry={borderRadius}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#tour-mask)"
              />
            </svg>

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

            {/* Step 1: Floating Draggable Sample PDF & Path Guide */}
            {currentStep?.id === "step-upload" && elementRect && (() => {
              const samplePillWidth = 270;
              const samplePillHeight = 48;
              const pillTop = Math.max(16, elementRect.top - 72);
              const pillLeft = Math.max(
                20,
                Math.min(
                  window.innerWidth - samplePillWidth - 20,
                  elementRect.left + elementRect.width / 2 - samplePillWidth / 2
                )
              );
              const startX = pillLeft + samplePillWidth / 2;
              const startY = pillTop + samplePillHeight;
              const endX = elementRect.left + elementRect.width / 2;
              const endY = Math.min(elementRect.top + 45, elementRect.top + elementRect.height / 2);
              const controlY = (startY + endY) / 2;
              const badgeX = (startX + endX) / 2;
              const badgeY = (startY + endY) / 2;

              return (
                <div className="tour-drag-guide-layer">
                  {/* Curved animated arrow path */}
                  <svg className="tour-drag-path-svg">
                    <defs>
                      <marker
                        id="tour-arrowhead"
                        markerWidth="8"
                        markerHeight="8"
                        refX="4"
                        refY="4"
                        orient="auto"
                      >
                        <polygon points="0 1, 7 4, 0 7" fill="#2563eb" />
                      </marker>
                    </defs>
                    <path
                      d={`M ${startX} ${startY} Q ${startX} ${controlY}, ${endX} ${endY}`}
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeDasharray="6,5"
                      fill="none"
                      className="tour-animated-dash"
                      markerEnd="url(#tour-arrowhead)"
                    />
                  </svg>

                  {/* Floating Path Badge */}
                  <div
                    className="tour-drag-path-badge"
                    style={{ left: badgeX, top: badgeY }}
                  >
                    <ArrowDown size={13} />
                    <span>Drag PDF here (or click)</span>
                  </div>

                  {/* Floating Draggable Sample PDF */}
                  <div
                    className="tour-floating-sample-card"
                    style={{ top: pillTop, left: pillLeft }}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/extractai-sample", "true");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("extractai:load-sample"));
                    }}
                    title="Drag this sample into the dropzone or click to load"
                  >
                    <div className="tour-floating-grip">
                      <GripVertical size={14} />
                    </div>
                    <div className="tour-floating-icon">
                      <FileText size={17} />
                    </div>
                    <div className="tour-floating-details">
                      <span className="tour-floating-filename">AMGN-135003565.pdf</span>
                      <span className="tour-floating-meta">Sample PDF • 142 KB</span>
                    </div>
                    <div className="tour-floating-action-badge">
                      <span>Drag to drop</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Floating Callout Card */}
            {currentStep && (
              <div
                ref={cardRef}
                className="tour-card"
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

                <h4 className="tour-card-title">{currentStep.title}</h4>
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
