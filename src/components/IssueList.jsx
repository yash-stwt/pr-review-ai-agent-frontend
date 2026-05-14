import SeverityBadge from "./SeverityBadge";
import ApplyFixButton from "./fix/ApplyFixButton";

/**
 * Renders a list of review issues.
 * Each item shows severity badge, title, optional file path + line number, description,
 * and an ApplyFixButton when fix props are provided.
 */
export default function IssueList({ items, getFixState, onGenerateFix, onPreviewFix }) {
  if (!items?.length) {
    return (
      <ul>
        <li className="issue-item">
          <p className="description">No issues found.</p>
        </li>
      </ul>
    );
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li className="issue-item" key={`${item.title}-${index}`}>
          <div className="issue-head">
            <SeverityBadge severity={item.severity} />
            <strong>{item.title}</strong>
          </div>
          {(item.filePath || item.lineNumber) && (
            <p className="issue-location">
              {item.filePath && (
                <span className="issue-filepath">{item.filePath}</span>
              )}
              {item.lineNumber && (
                <span className="issue-line">line {item.lineNumber}</span>
              )}
            </p>
          )}
          <p className="description">{item.description}</p>
          {getFixState && onGenerateFix && onPreviewFix && (
            <ApplyFixButton
              issue={item}
              fixState={getFixState(item)}
              onGenerate={onGenerateFix}
              onPreview={onPreviewFix}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
