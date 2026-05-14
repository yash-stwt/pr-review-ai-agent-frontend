import { useState } from "react";
import IssueList from "../IssueList";

const CATEGORIES = [
  { key: "bugs", label: "Bugs" },
  { key: "security", label: "Security" },
  { key: "quality", label: "Code Quality" },
  { key: "improvements", label: "Improvements" },
];

/**
 * Expandable accordion sections for each finding category within a file card.
 * Collapsed by default.
 */
export default function FileFindingsAccordion({ bugs, security, quality, improvements }) {
  const data = { bugs, security, quality, improvements };

  return (
    <div className="file-findings-accordion">
      {CATEGORIES.map(({ key, label }) => {
        const items = data[key] ?? [];
        if (items.length === 0) return null;
        return <AccordionSection key={key} label={label} items={items} />;
      })}
    </div>
  );
}

function AccordionSection({ label, items }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="file-accordion-section">
      <button
        type="button"
        className="file-accordion-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="file-accordion-toggle">{open ? "▾" : "▸"}</span>
        <span className="file-accordion-label">{label}</span>
        <span className="file-accordion-count">{items.length}</span>
      </button>
      {open && (
        <div className="file-accordion-body">
          <IssueList items={items} />
        </div>
      )}
    </div>
  );
}
