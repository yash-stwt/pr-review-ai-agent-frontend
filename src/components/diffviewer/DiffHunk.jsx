import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import DiffLineRow from "./DiffLineRow";
import InlineCommentThread from "./InlineCommentThread";

/**
 * Renders a single hunk. Uses virtualization when the parent file has >500 total lines.
 */
export default function DiffHunk({ hunk, commentMap, filePath, highlightedTokens, useVirtual }) {
  const parentRef = useRef(null);
  const lines = hunk.lines || [];

  // Virtual mode for large files
  if (useVirtual && lines.length > 100) {
    return (
      <VirtualizedHunk
        lines={lines}
        commentMap={commentMap}
        filePath={filePath}
        highlightedTokens={highlightedTokens}
        parentRef={parentRef}
      />
    );
  }

  // Normal rendering
  return (
    <div className="dv-hunk">
      <div className="dv-hunk-header" style={{ background: "#0d1a30", color: "#5f8bff", fontSize: 12, padding: "3px 14px", borderTop: "1px solid #1a2a4a", borderBottom: "1px solid #1a2a4a" }}>
        @@ -{hunk.oldStart} +{hunk.newStart} @@ {hunk.header}
      </div>
      {lines.map((line, idx) => {
        const lineNum = line.newLineNumber > 0 ? line.newLineNumber : line.oldLineNumber;
        const key = `${filePath}::${lineNum}`;
        const comments = commentMap?.get(key);
        const tokens = highlightedTokens?.get(idx);

        return (
          <div key={idx}>
            <DiffLineRow line={line} tokens={tokens} />
            {comments?.length > 0 && <InlineCommentThread comments={comments} />}
          </div>
        );
      })}
    </div>
  );
}

function VirtualizedHunk({ lines, commentMap, filePath, highlightedTokens, parentRef }) {
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  return (
    <div className="dv-hunk">
      <div
        ref={parentRef}
        style={{ height: Math.min(600, lines.length * 24), overflow: "auto" }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const line = lines[virtualRow.index];
            const lineNum = line.newLineNumber > 0 ? line.newLineNumber : line.oldLineNumber;
            const key = `${filePath}::${lineNum}`;
            const comments = commentMap?.get(key);
            const tokens = highlightedTokens?.get(virtualRow.index);

            return (
              <div
                key={virtualRow.index}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  width: "100%",
                }}
              >
                <DiffLineRow line={line} tokens={tokens} />
                {comments?.length > 0 && <InlineCommentThread comments={comments} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
