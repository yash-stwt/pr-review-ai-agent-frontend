import FileRiskBadge from "./FileRiskBadge";
import FileFindingsAccordion from "./FileFindingsAccordion";

/**
 * Per-file analysis card showing risk badge, stats, and expandable findings.
 */
export default function FileAnalysisCard({ fileResult }) {
  if (!fileResult) return null;

  const isFailed = fileResult.status === "FAILED";

  return (
    <div className="file-analysis-card">
      {/* Header */}
      <div className="file-card-header">
        <span className="file-card-path">{fileResult.filePath}</span>
        <FileRiskBadge riskScore={fileResult.riskScore} />
      </div>

      {/* Meta row */}
      <div className="file-card-meta">
        <span className="file-card-change-type">{fileResult.changeType}</span>
        <span className="file-card-lang">{fileResult.language}</span>
        <span className="file-card-stats">
          <span style={{ color: "#3dba7a" }}>+{fileResult.linesAdded}</span>
          {" "}
          <span style={{ color: "#c0445a" }}>−{fileResult.linesRemoved}</span>
        </span>
      </div>

      {/* Summary */}
      {fileResult.summary && (
        <p className="file-card-summary">{fileResult.summary}</p>
      )}

      {/* Error state */}
      {isFailed && (
        <div className="file-card-error">
          ⚠️ Analysis failed: {fileResult.errorMessage || "Unknown error"}
        </div>
      )}

      {/* Findings */}
      {!isFailed && (
        <FileFindingsAccordion
          bugs={fileResult.bugs}
          security={fileResult.security}
          quality={fileResult.quality}
          improvements={fileResult.improvements}
        />
      )}
    </div>
  );
}
