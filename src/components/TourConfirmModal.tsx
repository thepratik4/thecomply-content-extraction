import React, { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import "./TourConfirmModal.css";

interface TourConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TourConfirmModal: React.FC<TourConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Focus card on open
    const focusTimer = setTimeout(() => {
      cardRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
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
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      lastActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="tour-modal-backdrop"
      onClick={onCancel}
    >
      <div
        ref={cardRef}
        className="tour-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-confirm-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="tour-modal-close-btn"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="tour-modal-header">
          <div className="tour-modal-icon-wrap">
            <AlertTriangle size={20} />
          </div>
          <h3 id="tour-confirm-modal-title" className="tour-modal-title">
            Restart Tour &amp; Reset Workspace?
          </h3>
        </div>

        <div className="tour-modal-body">
          <p className="tour-modal-desc">
            Your recent work won't be saved and the guided tour will start from
            the beginning. Do you want to continue?
          </p>
        </div>

        <div className="tour-modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-confirm"
            onClick={onConfirm}
          >
            <span>Continue &amp; Start Tour</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
