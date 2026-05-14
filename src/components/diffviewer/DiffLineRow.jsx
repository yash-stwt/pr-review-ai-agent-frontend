/**
 * Renders a single diff line with gutter (line numbers) and code content.
 * Applies green/red/neutral coloring based on line type.
 * Renders syntax-highlighted tokens when available.
 */

const LINE_STYLES = {
  added: {
    row: { background: "#0d3320" },
    gutter: { background: "#082a18", color: "#3dba7a", borderRight: "1px solid #1a4a30" },
    code: { color: "#7effc0" },
  },
  removed: {
    row: { background: "#3a0d18" },
    gutter: { background: "#2e0a12", color: "#c0445a", borderRight: "1px solid #5a1a28" },
    code: { color: "#ffb3c1" },
  },
  context: {
    row: { background: "#080e1e" },
    gutter: { background: "#0d1324", color: "#4a5a80", borderRight: "1px solid #1a2440" },
    code: { color: "#c8d3f5" },
  },
};

const TOKEN_COLORS = {
  keyword: "#c792ea",
  string: "#c3e88d",
  number: "#f78c6c",
  comment: "#546e7a",
  function: "#82aaff",
  "class-name": "#ffcb6b",
  operator: "#89ddff",
  punctuation: "#89ddff",
  boolean: "#f78c6c",
  builtin: "#82aaff",
  property: "#f07178",
  tag: "#f07178",
  "attr-name": "#ffcb6b",
  "attr-value": "#c3e88d",
};

export default function DiffLineRow({ line, tokens, viewMode }) {
  const type = line.type || "context";
  const styles = LINE_STYLES[type] || LINE_STYLES.context;
  const prefix = type === "added" ? "+" : type === "removed" ? "−" : " ";

  return (
    <div className="dv-line-row" style={styles.row}>
      {/* Gutter */}
      <div className="dv-gutter" style={styles.gutter}>
        <span className="dv-line-num">{line.oldLineNumber > 0 ? line.oldLineNumber : ""}</span>
        <span className="dv-line-num">{line.newLineNumber > 0 ? line.newLineNumber : ""}</span>
      </div>
      {/* Code */}
      <div className="dv-code" style={styles.code}>
        <span className="dv-prefix">{prefix}</span>
        {tokens && tokens.length > 0 ? (
          tokens.map((token, i) => (
            <span key={i} style={{ color: TOKEN_COLORS[token.type] || undefined }}>
              {token.value}
            </span>
          ))
        ) : (
          <span>{line.content || ""}</span>
        )}
      </div>
    </div>
  );
}
