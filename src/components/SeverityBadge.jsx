import { SEVERITY_COLORS } from "../utils/severityUtils";

/**
 * Pill badge that renders a severity level with the correct colour scheme.
 * Handles Critical | High | Medium | Low (falls back to Low for unknown values).
 */
export default function SeverityBadge({ severity, size = "sm" }) {
  const s = severity || "Low";
  const colors = SEVERITY_COLORS[s] ?? SEVERITY_COLORS.Low;
  const fontSize = size === "xs" ? 10 : 11;
  const padding  = size === "xs" ? "2px 6px" : "3px 8px";

  return (
    <span
      style={{
        fontSize,
        borderRadius: 999,
        padding,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.text,
        fontWeight: 700,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {s}
    </span>
  );
}
