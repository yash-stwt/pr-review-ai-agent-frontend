import { getRiskMeta } from "../utils/severityUtils";

/**
 * AI Executive Summary card — shown at the top of the review results.
 * Displays the AI-generated summary, risk badge, and key statistics.
 */
export default function SummaryCard({ analysis, diffInsights }) {
  if (!analysis) return null;

  const { label, color, bg } = getRiskMeta(analysis.riskScore);
  const totalIssues =
    (analysis.bugs?.length ?? 0) +
    (analysis.security?.length ?? 0) +
    (analysis.quality?.length ?? 0) +
    (analysis.improvements?.length ?? 0);

  return (
    <div className="summary-card">
      <div className="summary-header">
        <div className="summary-text-block">
          <p className="summary-label">AI Executive Summary</p>
          <p className="summary-text">{analysis.executiveSummary}</p>
        </div>

        <div
          className="summary-risk-badge"
          style={{ borderColor: color, color, background: bg }}
        >
          <span className="summary-risk-score">{analysis.riskScore}</span>
          <span className="summary-risk-label">{label}</span>
        </div>
      </div>

      <div className="summary-stats">
        <StatPill label="Risk Score"    value={`${analysis.riskScore}/100`} />
        <StatPill
          label="Critical / High"
          value={analysis.criticalCount ?? 0}
          highlight={(analysis.criticalCount ?? 0) > 0}
        />
        <StatPill label="Total Issues"  value={totalIssues} />
        <StatPill label="Files Changed" value={diffInsights.filesAffected} />
        <StatPill label="Complexity"    value={`${diffInsights.complexityScore}/100`} />
        <StatPill
          label="Churn"
          value={`+${diffInsights.additions} / -${diffInsights.deletions}`}
        />
      </div>
    </div>
  );
}

function StatPill({ label, value, highlight }) {
  return (
    <div className="summary-stat">
      <p className="summary-stat-label">{label}</p>
      <p
        className="summary-stat-value"
        style={highlight ? { color: "#ff6b7a" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
