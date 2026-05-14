import { getRiskMeta } from "../../utils/severityUtils";

/**
 * Aggregated PR-level summary bar at the top of the file analysis view.
 */
export default function PRAnalysisSummary({ prAnalysis }) {
  if (!prAnalysis) return null;

  const { label, color, bg } = getRiskMeta(prAnalysis.overallRiskScore);

  return (
    <div className="pr-analysis-summary">
      <div className="pr-summary-header">
        <div className="pr-summary-risk" style={{ background: bg, color, borderColor: color }}>
          <span className="pr-summary-score">{prAnalysis.overallRiskScore}</span>
          <span className="pr-summary-label">{label}</span>
        </div>
        <div className="pr-summary-text">
          <p className="pr-summary-executive">{prAnalysis.executiveSummary}</p>
        </div>
      </div>
      <div className="pr-summary-stats">
        <div className="pr-summary-stat">
          <span className="pr-summary-stat-value">{prAnalysis.filesAnalyzed}</span>
          <span className="pr-summary-stat-label">Files</span>
        </div>
        <div className="pr-summary-stat">
          <span className="pr-summary-stat-value" style={prAnalysis.criticalCount > 0 ? { color: "#ff6b7a" } : undefined}>
            {prAnalysis.criticalCount}
          </span>
          <span className="pr-summary-stat-label">Critical/High</span>
        </div>
        <div className="pr-summary-stat">
          <span className="pr-summary-stat-value">{prAnalysis.totalFindings}</span>
          <span className="pr-summary-stat-label">Total Issues</span>
        </div>
      </div>
    </div>
  );
}
