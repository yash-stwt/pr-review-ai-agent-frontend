/**
 * Toolbar with unified/side-by-side toggle and collapse-all button.
 */
export default function DiffViewerToolbar({ viewMode, onViewModeChange, onCollapseAll, isMobile }) {
  return (
    <div className="dv-toolbar">
      <div className="dv-toolbar-group">
        <button
          type="button"
          className={`dv-toolbar-btn ${viewMode === "unified" ? "dv-toolbar-btn--active" : ""}`}
          onClick={() => onViewModeChange("unified")}
        >
          Unified
        </button>
        {!isMobile && (
          <button
            type="button"
            className={`dv-toolbar-btn ${viewMode === "split" ? "dv-toolbar-btn--active" : ""}`}
            onClick={() => onViewModeChange("split")}
          >
            Side-by-side
          </button>
        )}
      </div>
      <button type="button" className="dv-toolbar-btn" onClick={onCollapseAll}>
        Collapse All
      </button>
    </div>
  );
}
