import { getRiskMeta } from "../../utils/severityUtils";

/**
 * Small colored badge showing a file's risk score and label.
 */
export default function FileRiskBadge({ riskScore }) {
  const { label, color, bg } = getRiskMeta(riskScore ?? 0);

  return (
    <span
      className="file-risk-badge"
      style={{ background: bg, color, borderColor: color }}
    >
      {riskScore} · {label}
    </span>
  );
}
