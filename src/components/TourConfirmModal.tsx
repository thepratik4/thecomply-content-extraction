import React, { useEffect } from "react";
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
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="tour-modal-card"
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
          <h3 className="tour-modal-title">Restart Tour &amp; Reset Workspace?</h3>
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
