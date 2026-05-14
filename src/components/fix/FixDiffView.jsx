/**
 * Mini before/after diff renderer for the fix preview modal.
 * Shows removed lines (beforeCode) in red and added lines (afterCode) in green.
 */
export default function FixDiffView({ beforeCode, afterCode }) {
  const beforeLines = (beforeCode || "").split("\n");
  const afterLines = (afterCode || "").split("\n");

  return (
    <div className="fix-diff-view">
      {beforeLines.map((line, i) => (
        <div key={`r-${i}`} className="fix-diff-line fix-diff-line--removed">
          <span className="fix-diff-prefix">−</span>
          <span className="fix-diff-code">{line || " "}</span>
        </div>
      ))}
      {afterLines.map((line, i) => (
        <div key={`a-${i}`} className="fix-diff-line fix-diff-line--added">
          <span className="fix-diff-prefix">+</span>
          <span className="fix-diff-code">{line || " "}</span>
        </div>
      ))}
    </div>
  );
}
