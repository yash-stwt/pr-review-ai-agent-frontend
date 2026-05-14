# AI Code Reviewer — Frontend

A production-grade React + Vite frontend for AI-assisted pull request reviews. Paste a git diff or connect directly to GitHub, then get instant AI-powered analysis with risk scoring, severity filtering, inline diff comments, per-file analysis, and AI-generated code fixes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 7 |
| Charts | Recharts |
| Diff Rendering | react-diff-view |
| Syntax Highlighting | refractor (Prism-based, lazy-loaded) |
| Virtualization | @tanstack/react-virtual |
| Styling | Plain CSS (dark theme) |

---

## Features

### Phase 1
- **Git Diff Input** — paste a unified diff or fetch directly from a GitHub PR
- **AI Review Results** — risk score (0–100), executive summary, bugs, security issues, code quality findings, and improvement suggestions
- **Severity Filtering** — filter findings by Critical / High / Medium / Low with live counts
- **Inline Review** — AI findings mapped to exact diff lines with comment threads
- **Code Improvement Plan** — side-by-side before/after code change cards
- **PR Dashboard** — risk trend charts, severity distribution, file type breakdown, team analytics

### Phase 2
- **Enhanced Diff Viewer** — GitHub-style collapsible file blocks with syntax highlighting, sticky headers, severity badges, and virtualization for large diffs (>500 lines)
- **Apply AI Fix** — "Generate Fix" button on each finding; preview before/after in a modal; accept copies the fix to clipboard
- **File-Wise Analysis** — independent per-file risk scores, expandable finding categories, progress bar for large PRs

### Phase 3
- **Multi-Model AI Provider Selection** — dropdown showing all registered providers (Groq, Gemini, Claude, OpenAI); selected provider is used first with 3 retries before fallback
- **Provider Metadata Bar** — shows which model was used, latency, token count, and estimated cost after each analysis

---

## Project Structure

```
frontend/src/
├── components/
│   ├── diffviewer/           # Enhanced GitHub-style diff viewer
│   │   ├── DiffViewer.jsx
│   │   ├── DiffFileBlock.jsx
│   │   ├── DiffHunk.jsx
│   │   ├── DiffLineRow.jsx
│   │   ├── DiffViewerToolbar.jsx
│   │   ├── InlineCommentThread.jsx
│   │   └── syntaxHighlight.js
│   ├── fileanalysis/         # Per-file analysis components
│   │   ├── FileAnalysisView.jsx
│   │   ├── FileAnalysisCard.jsx
│   │   ├── FileRiskBadge.jsx
│   │   ├── FileFindingsAccordion.jsx
│   │   └── PRAnalysisSummary.jsx
│   ├── fix/                  # Apply AI Fix components
│   │   ├── ApplyFixButton.jsx
│   │   ├── FixDiffView.jsx
│   │   ├── FixPreviewModal.jsx
│   │   └── useApplyFix.js
│   ├── FilterBar.jsx         # Severity filter chips
│   ├── IssueList.jsx         # Issue card list
│   ├── ProviderMetadataBar.jsx
│   ├── SeverityBadge.jsx
│   ├── SummaryCard.jsx       # Executive summary + KPI stats
│   └── InlineDiffViewer.jsx  # Original inline diff viewer
├── hooks/
│   ├── useFilteredIssues.js
│   └── useProviders.js
├── utils/
│   ├── apiService.js         # Centralized API calls
│   ├── errorHandler.js
│   └── severityUtils.js      # Colors, labels, risk metadata
├── App.jsx                   # Main application component
├── main.jsx
└── styles.css                # Global dark theme styles
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- The [backend](../backend/README.md) running on `http://localhost:8081`

### Install & Run

```bash
# Clone the repository
git clone <repo-url>
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app opens at **http://localhost:5173**.

### Build for Production

```bash
npm run build
# Output is in dist/
```

### Preview Production Build

```bash
npm run preview
```

---

## Configuration

The API base URL is set in `src/utils/apiService.js`:

```js
const API_BASE_URL = 'http://localhost:8081/api';
```

Change this to your deployed backend URL for production.

---

## Usage

### Basic Review

1. Paste a git diff into the **Git Diff** tab, or enter your GitHub token + repo details in the **GitHub PR** tab and click **Fetch PR Diff**
2. Select an **AI Provider** from the dropdown (Groq is the default; Gemini/Claude require API keys set on the backend)
3. Click **Analyze with AI**
4. Review findings in the four categories — use the severity filter chips to focus on Critical/High issues

### Inline Review

Click **Inline Review** to see AI findings attached directly to the diff lines that triggered them.

### File Analysis

Click **File Analysis** to analyze each changed file independently. Each file gets its own risk score, findings, and summary. Large PRs (>20 files) are processed asynchronously with a progress bar.

### Apply AI Fix

On any finding card that has a file path and line number, click **🔧 Generate Fix**. Once generated, click **✨ Preview Fix** to see the before/after comparison. Click **Accept Fix (Copy)** to copy the corrected code to your clipboard.

### Code Improvement Plan

Click **Improvement Plan** to get a side-by-side before/after view of all suggested code changes.

---

## AI Provider Selection

The provider dropdown shows all registered providers:

- 🟢 **Configured** — API key is set, provider is active
- ⚪ **Not configured** — provider is registered but API key is missing

When you select a provider, it is tried **first** for every analysis. If it fails 3 times, the system automatically falls back to the next available configured provider.

To enable additional providers, set the corresponding environment variable on the backend:
- Gemini: `GEMINI_API_KEY`
- Claude: `CLAUDE_API_KEY`

---

## Environment & Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Responsive layout — works on mobile (unified diff view only on small screens)
- Dark mode only

---

## License

MIT
