import { SEVERITY_COLORS, SEVERITY_ORDER } from "../utils/severityUtils";

/**
 * Severity filter chip bar.
 * Clicking a chip toggles that severity on/off in the active filter set.
 * Shows a count badge per severity based on all issues passed in.
 */
export default function FilterBar({ allIssues, activeSeverities, onChange }) {
  const counts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = (allIssues ?? []).filter((i) => i.severity === s).length;
    return acc;
  }, {});

  const toggle = (severity) => {
    if (activeSeverities.includes(severity)) {
      // Don't allow deselecting the last active chip
      if (activeSeverities.length === 1) return;
      onChange(activeSeverities.filter((s) => s !== severity));
    } else {
      onChange([...activeSeverities, severity]);
    }
  };

  const allActive = activeSeverities.length === SEVERITY_ORDER.length;

  return (
    <div className="filter-bar">
      <span className="filter-label">Filter by severity:</span>

      {SEVERITY_ORDER.map((s) => {
        const active = activeSeverities.includes(s);
        const colors = SEVERITY_COLORS[s];
        return (
          <button
            key={s}
            type="button"
            className={`filter-chip ${active ? "filter-chip--active" : ""}`}
            onClick={() => toggle(s)}
            style={
              active
                ? {
                    background: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }
                : undefined
            }
            aria-pressed={active}
          >
            <span
              className="filter-dot"
              style={{ background: active ? colors.dot : "#4a5580" }}
            />
            {s}
            {counts[s] > 0 && (
              <span className="filter-count">{counts[s]}</span>
            )}
          </button>
        );
      })}

      {!allActive && (
        <button
          type="button"
          className="filter-chip filter-chip--reset"
          onClick={() => onChange([...SEVERITY_ORDER])}
        >
          Show All
        </button>
      )}
    </div>
  );
}
