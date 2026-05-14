import { useState, useEffect, useRef } from "react";
import SeverityBadge from "../SeverityBadge";
import FixDiffView from "./FixDiffView";

/**
 * Modal overlay displaying a before/after fix comparison.
 * Accept copies afterCode to clipboard; Reject closes the modal.
 */
export default function FixPreviewModal({ fix, issue, onAccept, onReject }) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!fix) return;
    const handler = (e) => {
      if (e.key === "Escape") onReject();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fix, onReject]);

  // Focus trap
  useEffect(() => {
    if (fix && modalRef.current) {
      modalRef.current.focus();
    }
  }, [fix]);

  if (!fix) return null;

  const handleAccept = async () => {
    try {
      await navigator.clipboard.writeText(fix.afterCode);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onAccept();
      }, 1200);
    } catch {
      // Fallback: select text
      onAccept();
    }
  };

  return (
    <div className="fix-modal-overlay" onClick={onReject}>
      <div
        className="fix-modal"
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Fix Preview"
      >
        {/* Header */}
        <div className="fix-modal-header">
          <div className="fix-modal-title-row">
            {issue && <SeverityBadge severity={issue.severity} />}
            <h3 className="fix-modal-title">{issue?.title || "AI Fix"}</h3>
          </div>
          <button className="fix-modal-close" type="button" onClick={onReject} aria-label="Close">✕</button>
        </div>

        {/* Meta */}
        <div className="fix-modal-meta">
          <span className="fix-modal-filepath">{fix.filePath}</span>
          <span className="fix-modal-lines">Lines {fix.startLine}–{fix.endLine}</span>
        </div>

        {/* Explanation */}
        <p className="fix-modal-explanation">{fix.explanation}</p>

        {/* Diff */}
        <FixDiffView beforeCode={fix.beforeCode} afterCode={fix.afterCode} />

        {/* Actions */}
        <div className="fix-modal-actions">
          <button className="btn btn-primary" type="button" onClick={handleAccept}>
            {copied ? "✓ Copied!" : "Accept Fix (Copy)"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onReject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
