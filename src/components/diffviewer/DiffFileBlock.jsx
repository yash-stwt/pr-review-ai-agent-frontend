import { useState, useEffect, useMemo } from "react";
import DiffHunk from "./DiffHunk";
import SeverityBadge from "../SeverityBadge";
import { highlight, detectLanguageFromPath } from "./syntaxHighlight";
import { SEVERITY_ORDER } from "../../utils/severityUtils";

/**
 * Collapsible per-file block with sticky header, severity badge, and hunk rendering.
 */
export default function DiffFileBlock({ diffFile, comments, commentMap, viewMode, forceCollapsed }) {
  const [expanded, setExpanded] = useState(true);
  const [highlightedTokens, setHighlightedTokens] = useState(null);

  // Sync with collapse-all
  useEffect(() => {
    if (forceCollapsed) setExpanded(false);
  }, [forceCollapsed]);

  const filePath = diffFile.filePath || diffFile.newPath || "unknown";
  const language = diffFile.language || detectLanguageFromPath(filePath);
  const totalChangedLines = (diffFile.linesAdded || 0) + (diffFile.linesRemoved || 0);
  const useVirtual = totalChangedLines > 500;

  // Count comments for this file
  const commentCount = useMemo(() => {
    let count = 0;
    if (commentMap) {
      commentMap.forEach((_, key) => {
        if (key.startsWith(`${filePath}::`)) count++;
      });
    }
    return count;
  }, [commentMap, filePath]);

  // Highest severity in this file's comments
  const highestSeverity = useMemo(() => {
    if (!comments?.length) return null;
    let best = SEVERITY_ORDER.length;
    for (const c of comments) {
      const idx = SEVERITY_ORDER.indexOf(c.severity);
      if (idx >= 0 && idx < best) best = idx;
    }
    return best < SEVERITY_ORDER.length ? SEVERITY_ORDER[best] : null;
  }, [comments]);

  // Lazy syntax highlighting
  useEffect(() => {
    if (!expanded || !diffFile.hunks?.length) return;

    let cancelled = false;
    const allLines = diffFile.hunks.flatMap((h) => h.lines || []);

    Promise.all(allLines.map((line) => highlight(line.content || "", language)))
      .then((results) => {
        if (cancelled) return;
        const tokenMap = new Map();
        let globalIdx = 0;
        for (const hunk of diffFile.hunks) {
          for (let i = 0; i < (hunk.lines?.length || 0); i++) {
            tokenMap.set(i, results[globalIdx]);
            globalIdx++;
          }
        }
        setHighlightedTokens(tokenMap);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [expanded, diffFile, language]);

  const changeTypeBadge = diffFile.changeType && diffFile.changeType !== "modified" ? (
    <span className="dv-change-type-badge">{diffFile.changeType}</span>
  ) : null;

  return (
    <div className="dv-file-block">
      {/* Sticky file header */}
      <button
        type="button"
        className="dv-file-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="dv-file-toggle">{expanded ? "▾" : "▸"}</span>
        <span className="dv-file-path">{filePath}</span>
        {changeTypeBadge}
        {highestSeverity && <SeverityBadge severity={highestSeverity} size="xs" />}
        {commentCount > 0 && (
          <span className="dv-comment-badge">💬 {commentCount}</span>
        )}
        <span className="dv-file-stats">
          <span style={{ color: "#3dba7a" }}>+{diffFile.linesAdded || 0}</span>
          {" "}
          <span style={{ color: "#c0445a" }}>−{diffFile.linesRemoved || 0}</span>
        </span>
      </button>

      {/* File body */}
      {expanded && (
        <div className="dv-file-body">
          {diffFile.hunks?.map((hunk, idx) => (
            <DiffHunk
              key={idx}
              hunk={hunk}
              commentMap={commentMap}
              filePath={filePath}
              highlightedTokens={highlightedTokens}
              useVirtual={useVirtual}
            />
          ))}
          {(!diffFile.hunks || diffFile.hunks.length === 0) && (
            <p style={{ padding: 14, color: "#7a8fc9", fontSize: 13 }}>No hunks to display.</p>
          )}
        </div>
      )}
    </div>
  );
}
