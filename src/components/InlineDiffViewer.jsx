import { useState, useMemo } from "react";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import SeverityBadge from "./SeverityBadge";
import "react-diff-view/style/index.css";

/**
 * Builds a lookup map: "filePath::lineNumber" -> [InlineComment, ...]
 * Only includes comments whose severity is in activeSeverities.
 */
function buildCommentMap(comments, activeSeverities) {
  const map = new Map();
  for (const c of comments ?? []) {
    if (!activeSeverities.includes(c.severity)) continue;
    const key = `${c.filePath}::${c.lineNumber}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return map;
}

/** Category label → display colour */
const CATEGORY_COLORS = {
  bug:         "#ff6b7a",
  security:    "#ffbf66",
  quality:     "#5f8bff",
  improvement: "#4adf9a",
};

/** Per-line-type styles applied inline so they always win over library CSS */
const LINE_STYLES = {
  insert: {
    row:    { background: "#0f1a2e" },
    code:   { background: "#0f1a2e", color: "#c8d3f5" },
    gutter: { background: "#0c1525", color: "#5f8bff", borderRight: "1px solid #1e3a6a" },
  },
  delete: {
    row:    { background: "#0f1a2e" },
    code:   { background: "#0f1a2e", color: "#c8d3f5" },
    gutter: { background: "#0c1525", color: "#5f8bff", borderRight: "1px solid #1e3a6a" },
  },
  normal: {
    row:    { background: "#080e1e" },
    code:   { background: "#080e1e", color: "#c8d3f5" },
    gutter: { background: "#0d1324", color: "#4a5a80", borderRight: "1px solid #1a2440" },
  },
};

function InlineCommentThread({ comments }) {
  return (
    <div
      className="inline-comment-thread"
      style={{ background: "#080b14", borderTop: "1px solid #1a2440", borderBottom: "1px solid #1a2440" }}
    >
      {comments.map((c, i) => (
        <div
          key={i}
          className="inline-comment"
          style={{
            borderLeftColor: CATEGORY_COLORS[c.category] ?? "#5f8bff",
            background: "#111625",
          }}
        >
          <div className="inline-comment-header">
            <SeverityBadge severity={c.severity} size="xs" />
            <span
              className="inline-comment-category"
              style={{ color: CATEGORY_COLORS[c.category] ?? "#5f8bff" }}
            >
              {c.category}
            </span>
            <strong className="inline-comment-title" style={{ color: "#ecf0ff" }}>{c.title}</strong>
          </div>
          <p className="inline-comment-body" style={{ color: "#c8d3f5" }}>{c.body}</p>
        </div>
      ))}
    </div>
  );
}

function DiffFileBlock({ file, commentMap }) {
  const path = file.newPath || file.oldPath || "unknown";
  const [expanded, setExpanded] = useState(true);

  // Count how many comment threads exist for this file
  const commentCount = useMemo(() => {
    let n = 0;
    commentMap.forEach((_, key) => {
      if (key.startsWith(`${path}::`)) n++;
    });
    return n;
  }, [commentMap, path]);

  return (
    <div className="diff-file-block">
      <button
        type="button"
        className="diff-file-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="diff-file-toggle">{expanded ? "▾" : "▸"}</span>
        <span className="diff-file-path">{path}</span>
        {commentCount > 0 && (
          <span className="diff-comment-badge">
            💬 {commentCount} comment{commentCount !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {expanded && (
        <div className="diff-file-body" style={{ background: "#080e1e", color: "#c8d3f5" }}>
          <Diff
            viewType="unified"
            diffType={file.type}
            hunks={file.hunks}
            gutterType="default"
          >
            {(hunks) =>
              hunks.map((hunk) => (
                <Hunk
                  key={hunk.content}
                  hunk={hunk}
                  renderLine={(line) => {
                    const lineNum = line.newLineNumber ?? line.oldLineNumber ?? 0;
                    const key = `${path}::${lineNum}`;
                    const thread = commentMap.get(key);

                    // Determine line type for inline style
                    const type = line.type === "insert" ? "insert"
                               : line.type === "delete" ? "delete"
                               : "normal";
                    const ls = LINE_STYLES[type];

                    return (
                      <>
                        {/* Inject per-line colour via a style tag scoped to this row */}
                        <style>{`
                          .diff-line-${line.type || "normal"} td { background: ${ls.row.background} !important; }
                        `}</style>
                        {thread?.length > 0 && (
                          <tr
                            className="diff-comment-row"
                            style={{ background: "#080b14" }}
                          >
                            <td
                              colSpan={3}
                              className="diff-comment-cell"
                              style={{ background: "#080b14", padding: 0 }}
                            >
                              <InlineCommentThread comments={thread} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  }}
                />
              ))
            }
          </Diff>
        </div>
      )}
    </div>
  );
}

/**
 * InlineDiffViewer
 *
 * Props:
 *   diffText        — raw unified diff string
 *   comments        — InlineComment[] from /api/review/inline
 *   activeSeverities — string[] of severities to show (from FilterBar)
 */
export default function InlineDiffViewer({ diffText, comments, activeSeverities }) {
  const commentMap = useMemo(
    () => buildCommentMap(comments, activeSeverities),
    [comments, activeSeverities]
  );

  const files = useMemo(() => {
    try {
      return parseDiff(diffText ?? "");
    } catch {
      return [];
    }
  }, [diffText]);

  if (!diffText?.trim()) {
    return <p className="note">No diff available for inline view.</p>;
  }

  if (!files.length) {
    return <p className="note">Could not parse diff for inline view.</p>;
  }

  return (
    <div className="inline-diff-viewer">
      {files.map((file) => (
        <DiffFileBlock
          key={file.newPath || file.oldPath}
          file={file}
          commentMap={commentMap}
        />
      ))}
    </div>
  );
}
