import SeverityBadge from "../SeverityBadge";

const CATEGORY_COLORS = {
  bug: "#ff6b7a",
  security: "#ffbf66",
  quality: "#5f8bff",
  improvement: "#4adf9a",
};

/**
 * Renders a thread of inline AI comments below a diff line.
 */
export default function InlineCommentThread({ comments }) {
  if (!comments?.length) return null;

  return (
    <div className="dv-comment-thread" style={{ background: "#080b14", borderTop: "1px solid #1a2440", borderBottom: "1px solid #1a2440", padding: "8px 14px" }}>
      {comments.map((c, i) => (
        <div
          key={i}
          className="dv-comment"
          style={{
            borderLeft: `3px solid ${CATEGORY_COLORS[c.category] ?? "#5f8bff"}`,
            background: "#111625",
            borderRadius: "0 8px 8px 0",
            padding: "8px 12px",
            marginBottom: i < comments.length - 1 ? "6px" : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <SeverityBadge severity={c.severity} size="xs" />
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: CATEGORY_COLORS[c.category] ?? "#5f8bff" }}>
              {c.category}
            </span>
            <strong style={{ fontSize: 13, color: "#ecf0ff" }}>{c.title}</strong>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#c8d3f5", lineHeight: 1.6 }}>{c.body}</p>
        </div>
      ))}
    </div>
  );
}
