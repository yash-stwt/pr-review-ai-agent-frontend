/**
 * "Generate Fix" / "Preview Fix" button rendered on issue cards.
 * Only visible when the issue has both filePath and lineNumber.
 */
export default function ApplyFixButton({ issue, fixState, onGenerate, onPreview }) {
  // Don't render if issue doesn't have location info
  if (!issue?.filePath || !issue?.lineNumber) return null;

  const state = fixState || { status: "idle" };

  if (state.status === "loading") {
    return (
      <button className="btn-fix btn-fix--loading" type="button" disabled>
        <span className="btn-fix-spinner" /> Generating...
      </button>
    );
  }

  if (state.status === "success" && state.fix) {
    return (
      <button
        className="btn-fix btn-fix--preview"
        type="button"
        onClick={() => onPreview(state.fix, issue)}
      >
        ✨ Preview Fix
      </button>
    );
  }

  if (state.status === "error") {
    return (
      <div className="btn-fix-error-wrap">
        <button
          className="btn-fix btn-fix--retry"
          type="button"
          onClick={() => onGenerate(issue)}
        >
          ↻ Retry Fix
        </button>
        <span className="btn-fix-error-msg" title={state.error}>
          {state.error?.substring(0, 40)}
        </span>
      </div>
    );
  }

  // idle state
  return (
    <button
      className="btn-fix"
      type="button"
      onClick={() => onGenerate(issue)}
    >
      🔧 Generate Fix
    </button>
  );
}
