export const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];

export const SEVERITY_COLORS = {
  Critical: { bg: "#3d0f1a", border: "#7a1f35", text: "#ffb3c1", dot: "#ff4d6d" },
  High:     { bg: "#5b1f29", border: "#8d2e3f", text: "#ffd9dd", dot: "#ff6b7a" },
  Medium:   { bg: "#5f4421", border: "#906431", text: "#ffe8c8", dot: "#ffbf66" },
  Low:      { bg: "#1d4b34", border: "#2b7751", text: "#d7ffe8", dot: "#4adf9a" },
};

export function getRiskMeta(score) {
  if (score <= 20) return { label: "Safe",     color: "#4adf9a", bg: "#0d2e1e" };
  if (score <= 50) return { label: "Moderate", color: "#ffbf66", bg: "#2e2010" };
  if (score <= 80) return { label: "Risky",    color: "#ff6b7a", bg: "#2e1015" };
  return                   { label: "Critical", color: "#ff4d6d", bg: "#3d0f1a" };
}
