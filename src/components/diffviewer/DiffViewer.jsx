import { useState, useMemo, useEffect } from "react";
import DiffViewerToolbar from "./DiffViewerToolbar";
import DiffFileBlock from "./DiffFileBlock";

/**
 * Top-level DiffViewer orchestrator.
 *
 * Props:
 *   diffFiles        — enriched DiffFile[] from backend (with hunks, language, etc.)
 *   comments         — InlineComment[] from /api/review/inline
 *   activeSeverities — string[] of severities to show
 */
export default function DiffViewer({ diffFiles, comments, activeSeverities }) {
  const [viewMode, setViewMode] = useState("unified");
  const [collapseAll, setCollapseAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setViewMode("unified");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Build comment map filtered by active severities
  const commentMap = useMemo(() => {
    const map = new Map();
    for (const c of comments ?? []) {
      if (!activeSeverities.includes(c.severity)) continue;
      const key = `${c.filePath}::${c.lineNumber}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return map;
  }, [comments, activeSeverities]);

  // Group comments by file for per-file severity badge
  const commentsByFile = useMemo(() => {
    const byFile = {};
    for (const c of comments ?? []) {
      if (!activeSeverities.includes(c.severity)) continue;
      if (!byFile[c.filePath]) byFile[c.filePath] = [];
      byFile[c.filePath].push(c);
    }
    return byFile;
  }, [comments, activeSeverities]);

  const handleCollapseAll = () => {
    setCollapseAll(true);
    // Reset after a tick so it can be triggered again
    setTimeout(() => setCollapseAll(false), 100);
  };

  if (!diffFiles?.length) {
    return <p className="note">No diff files available for the enhanced viewer.</p>;
  }

  return (
    <div className="dv-container">
      <DiffViewerToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCollapseAll={handleCollapseAll}
        isMobile={isMobile}
      />
      <div className="dv-files">
        {diffFiles.map((file) => {
          const filePath = file.filePath || file.newPath || "unknown";
          return (
            <DiffFileBlock
              key={filePath}
              diffFile={file}
              comments={commentsByFile[filePath] || []}
              commentMap={commentMap}
              viewMode={viewMode}
              forceCollapsed={collapseAll}
            />
          );
        })}
      </div>
    </div>
  );
}
