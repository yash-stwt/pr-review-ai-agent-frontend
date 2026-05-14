import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import SummaryCard from "./components/SummaryCard";
import FilterBar from "./components/FilterBar";
import IssueList from "./components/IssueList";
import InlineDiffViewer from "./components/InlineDiffViewer";
import DiffViewer from "./components/diffviewer/DiffViewer";
import FixPreviewModal from "./components/fix/FixPreviewModal";
import { useApplyFix } from "./components/fix/useApplyFix";
import FileAnalysisView from "./components/fileanalysis/FileAnalysisView";
import ProviderMetadataBar from "./components/ProviderMetadataBar";
import { useProviders } from "./hooks/useProviders";
import ErrorAlert from "./components/ErrorAlert";
import { useFilteredIssues } from "./hooks/useFilteredIssues";
import { SEVERITY_ORDER } from "./utils/severityUtils";
import { handleError } from "./utils/errorHandler";
import * as apiService from "./utils/apiService";
const RISK_HISTORY_KEY = "ai-review-risk-history";
const TEAM_ANALYTICS_KEY = "ai-review-team-analytics";

export default function App() {
  const [activeTab, setActiveTab] = useState("diff");
  const [activePage, setActivePage] = useState("review");
  const [diffInput, setDiffInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [improvementPlan, setImprovementPlan] = useState(null);
  const [inlineReview, setInlineReview] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [inlining, setInlining] = useState(false);
  const [developerName, setDeveloperName] = useState("");
  const [riskHistory, setRiskHistory] = useState([]);
  const [teamAnalytics, setTeamAnalytics] = useState({});
  const [activeSeverities, setActiveSeverities] = useState([...SEVERITY_ORDER]);
  const [github, setGithub] = useState({ token: "", owner: "", repo: "", prNumber: "" });
  const [error, setError] = useState(null);
  const [previewFix, setPreviewFix] = useState(null);
  const [previewIssue, setPreviewIssue] = useState(null);
  const { getFixState, generateFix } = useApplyFix(diffInput);
  const { providers, selectedProviderId, selectProvider } = useProviders();
  const [providerMeta, setProviderMeta] = useState(null);

  const handlePreviewFix = (fix, issue) => { setPreviewFix(fix); setPreviewIssue(issue); };
  const handleCloseFixModal = () => { setPreviewFix(null); setPreviewIssue(null); };

  const reviewData = useMemo(
    () => analysis ?? { bugs: [], security: [], quality: [], improvements: [] },
    [analysis]
  );
  const filteredData = useFilteredIssues(reviewData, activeSeverities);
  const allIssues = useMemo(() => [
    ...(reviewData.bugs ?? []),
    ...(reviewData.security ?? []),
    ...(reviewData.quality ?? []),
    ...(reviewData.improvements ?? []),
  ], [reviewData]);
  const beforeCodeByFile = useMemo(() => parseBeforeCodeByFile(diffInput), [diffInput]);
  const diffInsights = useMemo(() => computeDiffInsights(diffInput), [diffInput]);
  const riskTrend = useMemo(() => riskHistory.slice(-8), [riskHistory]);
  const analyticsRows = useMemo(() => {
    return Object.entries(teamAnalytics)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalReviews - a.totalReviews);
  }, [teamAnalytics]);

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem(RISK_HISTORY_KEY) || "[]");
      const savedTeam = JSON.parse(localStorage.getItem(TEAM_ANALYTICS_KEY) || "{}");
      if (Array.isArray(savedHistory)) setRiskHistory(savedHistory);
      if (savedTeam && typeof savedTeam === "object") setTeamAnalytics(savedTeam);
    } catch {
      setRiskHistory([]);
      setTeamAnalytics({});
    }
  }, []);

  // Error handler
  const handleAppError = (err, context = 'Operation') => {
    const errorData = handleError(err, context);
    setError(errorData);
  };

  const dismissError = () => {
    setError(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    dismissError();
    try {
      const data = await apiService.analyzeReview(diffInput, selectedProviderId);
      setAnalysis(data);
      setProviderMeta(data._meta || null);
      setImprovementPlan(null);
      setInlineReview(null);
      setActivePage("review");
      setActiveSeverities([...SEVERITY_ORDER]);
      trackAnalytics(data);
    } catch (e) {
      handleAppError(e, 'Review Analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setDiffInput(""); setAnalysis(null); setImprovementPlan(null);
    setInlineReview(null); setActivePage("review");
    setActiveSeverities([...SEVERITY_ORDER]);
  };

  const handleGithubField = (field, value) => setGithub(prev => ({ ...prev, [field]: value }));

  const fetchPullRequestDiff = async () => {
    const { token, owner, repo, prNumber } = github;
    if (!token.trim() || !owner.trim() || !repo.trim() || !prNumber.trim()) {
      handleAppError(
        new Error('GitHub credentials validation'),
        'Validation Error',
      );
      setError({
        userMessage: 'Please fill in token, owner, repo, and PR number.',
        severity: 'error',
      });
      return;
    }
    setFetching(true);
    dismissError();
    try {
      const data = await apiService.fetchPullRequestDiff(token, owner, repo, prNumber);
      setDiffInput(data.diffText ?? "");
      setAnalysis(null);
      setImprovementPlan(null);
      setInlineReview(null);
      setActivePage("review");
      setActiveTab("diff");
    } catch (e) {
      handleAppError(e, 'GitHub PR Diff Fetch');
    } finally {
      setFetching(false);
    }
  };

  const handleGenerateImprovementPlan = async () => {
    if (!analysis) {
      setError({
        userMessage: 'Please run AI analysis first.',
        severity: 'error',
      });
      return;
    }
    if (!diffInput.trim()) {
      setError({
        userMessage: 'Please provide a diff before generating code improvements.',
        severity: 'error',
      });
      return;
    }
    setImproving(true);
    dismissError();
    try {
      const data = await apiService.generateImprovementPlan(diffInput, analysis);
      setImprovementPlan(data);
      setActivePage("improvements");
    } catch (e) {
      handleAppError(e, 'Code Improvement Plan Generation');
    } finally {
      setImproving(false);
    }
  };

  const handleInlineReview = async () => {
    if (!diffInput.trim()) {
      setError({
        userMessage: 'Please provide a diff before generating inline review.',
        severity: 'error',
      });
      return;
    }
    setInlining(true);
    dismissError();
    try {
      const data = await apiService.generateInlineReview(diffInput);
      setInlineReview(data);
      setActivePage("inline");
    } catch (e) {
      handleAppError(e, 'Inline Review Generation');
    } finally {
      setInlining(false);
    }
  };

  const trackAnalytics = (result) => {
    const actor = developerName.trim() || github.owner.trim() || "Anonymous";
    const now = new Date().toISOString();
    const mistakes = [
      ...(result?.bugs || []).map(x => x.title),
      ...(result?.security || []).map(x => x.title),
      ...(result?.quality || []).map(x => x.title),
    ];
    const historyEntry = { riskScore: result?.riskScore ?? 0, filesAffected: diffInsights.filesAffected, complexityScore: diffInsights.complexityScore, at: now };
    const nextHistory = [...riskHistory, historyEntry].slice(-30);
    setRiskHistory(nextHistory);
    localStorage.setItem(RISK_HISTORY_KEY, JSON.stringify(nextHistory));
    const existing = teamAnalytics[actor] || { totalReviews: 0, averageRisk: 0, lastRisk: 0, mistakes: {}, trend: [] };
    const totalReviews = existing.totalReviews + 1;
    const averageRisk = Math.round(((existing.averageRisk * existing.totalReviews) + (result?.riskScore ?? 0)) / totalReviews);
    const mistakeMap = { ...existing.mistakes };
    mistakes.forEach(title => { const k = title || "Untitled issue"; mistakeMap[k] = (mistakeMap[k] || 0) + 1; });
    const trend = [...(existing.trend || []), result?.riskScore ?? 0].slice(-10);
    const nextTeam = { ...teamAnalytics, [actor]: { totalReviews, averageRisk, lastRisk: result?.riskScore ?? 0, mistakes: mistakeMap, trend } };
    setTeamAnalytics(nextTeam);
    localStorage.setItem(TEAM_ANALYTICS_KEY, JSON.stringify(nextTeam));
  };

  function computeDiffInsights(diffText) {
    if (!diffText?.trim()) return { filesAffected: 0, additions: 0, deletions: 0, complexityScore: 0, testCoverageSuggestion: "Add tests for new logic and edge cases.", files: [], fileTypeCounts: {} };
    const lines = diffText.split("\n");
    let filesAffected = 0, additions = 0, deletions = 0, hunks = 0, touchedFunctions = 0, testFilesTouched = 0;
    const files = [], fileTypeCounts = {};
    for (const line of lines) {
      if (line.startsWith("diff --git ")) {
        filesAffected++;
        const parts = line.split(" ");
        const rightPath = normalizeDiffPath(parts[3] || "");
        if (rightPath) {
          files.push(rightPath);
          const ext = rightPath.includes(".") ? rightPath.split(".").pop().toLowerCase() : "no-ext";
          fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;
        }
        if (rightPath.toLowerCase().match(/test|spec|__tests__/)) testFilesTouched++;
      } else if (line.startsWith("@@")) { hunks++;
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
        if (/\b(function|class|if|for|while|switch)\b/.test(line)) touchedFunctions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) { deletions++; }
    }
    const complexityScore = Math.min(100, Math.round((filesAffected * 6) + (hunks * 3) + ((additions + deletions) / 8) + (touchedFunctions * 2)));
    const coverageBase = complexityScore > 70 ? 85 : complexityScore > 40 ? 70 : 55;
    const testCoverageSuggestion = testFilesTouched > 0
      ? `Target ~${Math.min(95, coverageBase + 5)}% coverage on changed modules; expand edge-case tests.`
      : `Target ~${coverageBase}% coverage; add unit + integration tests for changed files.`;
    return { filesAffected, additions, deletions, complexityScore, testCoverageSuggestion, files, fileTypeCounts };
  }

  function normalizeDiffPath(value) {
    if (!value) return "";
    return (value.startsWith("a/") || value.startsWith("b/")) ? value.slice(2) : value;
  }

  function parseBeforeCodeByFile(diffText) {
    const map = new Map();
    if (!diffText?.trim()) return map;
    let currentFile = null;
    for (const rawLine of diffText.split("\n")) {
      const line = rawLine ?? "";
      if (line.startsWith("diff --git ")) {
        const parts = line.split(" ");
        currentFile = normalizeDiffPath(parts[3] || "") || null;
        if (currentFile && !map.has(currentFile)) map.set(currentFile, { removed: [], context: [] });
        continue;
      }
      if (!currentFile || !map.has(currentFile)) continue;
      if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) continue;
      const entry = map.get(currentFile);
      if (line.startsWith("-")) entry.removed.push(line.slice(1));
      else if (line.startsWith(" ")) entry.context.push(line.slice(1));
    }
    const beforeCode = new Map();
    map.forEach((entry, file) => {
      const removed = entry.removed.filter(Boolean).slice(0, 140).join("\n").trim();
      const context = entry.context.filter(Boolean).slice(0, 80).join("\n").trim();
      beforeCode.set(file, removed || context || "");
    });
    return beforeCode;
  }

  function looksLikeCode(value) {
    return /[{}();=<>]|^\s*(import|package|class|public|private|const|let|function)\b/m.test(value || "");
  }

  const resolveBeforeCode = (change) => {
    const target = normalizeDiffPath(change?.filePath || "");
    if (target) {
      if (beforeCodeByFile.has(target)) { const s = beforeCodeByFile.get(target); if (s) return s; }
      for (const [path, snippet] of beforeCodeByFile.entries()) {
        if (path.endsWith(target) || target.endsWith(path)) { if (snippet) return snippet; }
      }
    }
    return looksLikeCode(change?.beforeCode || "") ? change.beforeCode : "";
  };

  const diffRowsForChange = (change) => {
    const code = resolveBeforeCode(change);
    const beforeLines = code ? code.split("\n") : [];
    const afterLines = change?.afterCode ? change.afterCode.split("\n") : [];
    const rows = [];
    let lineNumber = 1;
    beforeLines.forEach(line => rows.push({ lineNumber: lineNumber++, type: "removed", code: line }));
    afterLines.forEach(line => rows.push({ lineNumber: lineNumber++, type: "added", code: line }));
    return rows;
  };

  const reportCharts = useMemo(() => {
    const findingsByCategory = [
      { name: "Bugs", value: reviewData.bugs.length },
      { name: "Security", value: reviewData.security.length },
      { name: "Quality", value: reviewData.quality.length },
      { name: "Improvements", value: reviewData.improvements.length },
    ];
    const severityCount = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    allIssues.forEach(i => { const k = i?.severity || "Low"; if (severityCount[k] != null) severityCount[k]++; });
    const severityData = Object.entries(severityCount).map(([name, value]) => ({ name, value }));
    const trendData = riskTrend.map((x, idx) => ({ name: `${idx + 1}`, riskScore: x.riskScore, complexity: x.complexityScore }));
    const fileTypeData = Object.entries(diffInsights.fileTypeCounts || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    return { findingsByCategory, severityData, trendData, fileTypeData };
  }, [analysis, diffInsights, reviewData, riskTrend, allIssues]);

  const chartColors = { primary: "#5f8bff", high: "#ff6b7a", medium: "#ffbf66", low: "#4adf9a", critical: "#ff4d6d", grid: "#2a3354" };

  const topMistakesFor = (stats) => {
    const entries = Object.entries(stats?.mistakes || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return entries.length ? entries.map(([k, v]) => `${k} (${v})`).join(", ") : "No recurring issues tracked yet.";
  };

  const isDashboardPage = activePage === "dashboard";
  const isImprovementsPage = activePage === "improvements";
  const isInlinePage = activePage === "inline";
  const isFileAnalysisPage = activePage === "fileanalysis";
  const isFullPage = isDashboardPage || isImprovementsPage || isInlinePage || isFileAnalysisPage;

  // ── Inline Review Page ───────────────────────────────────────────────────
  const inlineSection = (
    <section className="card dashboard-page-card">
      <div className="page-header">
        <h2>Inline PR Review</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setActivePage("review")}>Back to Review</button>
      </div>
      <p className="subtitle-text">AI findings mapped directly to diff lines. Use the filter to focus on specific severities.</p>
      <FilterBar allIssues={inlineReview?.comments ?? []} activeSeverities={activeSeverities} onChange={setActiveSeverities} />
      {inlineReview?.diffFiles ? (
        <DiffViewer
          diffFiles={inlineReview.diffFiles}
          comments={inlineReview?.comments ?? []}
          activeSeverities={activeSeverities}
        />
      ) : (
        <InlineDiffViewer
          diffText={inlineReview?.diffText ?? diffInput}
          comments={inlineReview?.comments ?? []}
          activeSeverities={activeSeverities}
        />
      )}
    </section>
  );

  // ── Improvements Page ───────────────────────────────────────────────────
  const improvementsSection = (
    <section className="card dashboard-page-card">
      <div className="page-header">
        <h2>Code Improvement Plan</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setActivePage("review")}>Back to Review</button>
      </div>
      <p className="subtitle-text">{improvementPlan?.summary ?? "AI-generated code improvements based on the review findings."}</p>
      {!improvementPlan?.changes?.length ? (
        <p className="note">No concrete code changes were generated.</p>
      ) : (
        <div className="improvement-grid">
          {improvementPlan.changes.map((change, index) => (
            <article className="improvement-card" key={`${change.filePath}-${index}`}>
              {/* Header */}
              <div className="improvement-card-header">
                <span className="improvement-filepath">{change.filePath || "Unknown file"}</span>
                <span className="improvement-index">#{index + 1}</span>
              </div>
              {/* Rationale */}
              <p className="improvement-rationale">{change.rationale}</p>
              {/* Before / After */}
              <div className="improvement-diff">
                {change.beforeCode && (
                  <div className="improvement-diff-panel improvement-diff-panel--before">
                    <div className="improvement-diff-label improvement-diff-label--before">Before</div>
                    <pre className="improvement-code improvement-code--before">{change.beforeCode}</pre>
                  </div>
                )}
                {change.afterCode && (
                  <div className="improvement-diff-panel improvement-diff-panel--after">
                    <div className="improvement-diff-label improvement-diff-label--after">After</div>
                    <pre className="improvement-code improvement-code--after">{change.afterCode}</pre>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  // ── Dashboard Page ───────────────────────────────────────────────────────
  const dashboardSection = (
    <section className="card dashboard-page-card">
      <div className="page-header">
        <h2>PR Review Dashboard</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setActivePage("review")}>Back to Review</button>
      </div>
      <div className="analytics-grid">
        <article className="result-card">
          <h3>PR Review Report</h3>
          <div className="report-kpis">
            <div className="kpi"><p className="kpi-label">Risk Score</p><p className="kpi-value">{analysis ? analysis.riskScore : "--"}</p></div>
            <div className="kpi"><p className="kpi-label">Files Affected</p><p className="kpi-value">{diffInsights.filesAffected}</p></div>
            <div className="kpi"><p className="kpi-label">Complexity</p><p className="kpi-value">{diffInsights.complexityScore}/100</p></div>
            <div className="kpi"><p className="kpi-label">Churn</p><p className="kpi-value">+{diffInsights.additions} / -{diffInsights.deletions}</p></div>
          </div>
          <p className="metric-line"><strong>Test Coverage Suggestion:</strong> {diffInsights.testCoverageSuggestion}</p>
          <div className="chart-grid">
            <div className="chart-card"><h4>Risk Trend</h4>
              {!reportCharts.trendData.length ? <p className="note">Run multiple analyses to see trend.</p> : (
                <div className="chart chart-tall"><ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportCharts.trendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#98a2c9" /><YAxis stroke="#98a2c9" domain={[0, 100]} />
                    <Tooltip /><Legend />
                    <Line type="monotone" dataKey="riskScore" stroke={chartColors.primary} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="complexity" stroke="#8b5cff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer></div>
              )}
            </div>
            <div className="chart-card"><h4>Findings by Category</h4>
              <div className="chart chart-tall"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportCharts.findingsByCategory} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#98a2c9" /><YAxis allowDecimals={false} stroke="#98a2c9" />
                  <Tooltip /><Bar dataKey="value" fill={chartColors.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            </div>
            <div className="chart-card"><h4>Severity Distribution</h4>
              <div className="chart chart-pie"><ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                  <Tooltip /><Legend />
                  <Pie data={reportCharts.severityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {reportCharts.severityData.map(entry => (
                      <Cell key={entry.name} fill={entry.name === "Critical" ? chartColors.critical : entry.name === "High" ? chartColors.high : entry.name === "Medium" ? chartColors.medium : chartColors.low} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer></div>
            </div>
            <div className="chart-card"><h4>File Types (Top)</h4>
              <div className="chart chart-pie">
                {!reportCharts.fileTypeData.length ? <p className="note">Paste/fetch a diff to populate file stats.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportCharts.fileTypeData} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} stroke="#98a2c9" />
                      <YAxis type="category" dataKey="name" stroke="#98a2c9" width={60} />
                      <Tooltip /><Bar dataKey="value" fill="#38bdf8" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </article>
        <article className="result-card">
          <h3>Team Analytics</h3>
          {!analyticsRows.length ? <p className="note">No developer analytics yet. Run analysis with a developer name.</p> : (
            <div className="team-list">
              {analyticsRows.map(row => (
                <div className="team-item" key={row.name}>
                  <p className="metric-line"><strong>{row.name}</strong></p>
                  <p className="metric-line">Reviews: {row.totalReviews}</p>
                  <p className="metric-line">Avg Risk: {row.averageRisk}</p>
                  <p className="metric-line">Latest Risk: {row.lastRisk}</p>
                  <p className="metric-line">Common Mistakes: {topMistakesFor(row)}</p>
                  <p className="metric-line">Improvement: {(row.trend?.length || 0) >= 2 ? `${row.trend[0] - row.trend[row.trend.length - 1]} pts` : "Need more data"}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );

  // ── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <ErrorAlert error={error} onDismiss={dismissError} />
      <header className="hero">
        <div>
          <p className="badge">AI Code Reviewer</p>
          <h1>Review PRs in seconds, not hours.</h1>
          <p className="subtitle">Paste a git diff or pull directly from GitHub, then run an AI-assisted review for bugs, security, code quality, and improvement suggestions.</p>
        </div>
      </header>

      <main className={isFullPage ? "dashboard-main" : "content-grid"}>
        {isDashboardPage ? dashboardSection
          : isImprovementsPage ? improvementsSection
          : isInlinePage ? inlineSection
          : isFileAnalysisPage ? <FileAnalysisView diffText={diffInput} onBack={() => setActivePage("review")} />
          : (
          <>
          <section className="card">
            <h2>Input</h2>
            <div className="tabs" role="tablist" aria-label="Input source">
              <button className={`tab-btn ${activeTab === "diff" ? "active" : ""}`} onClick={() => setActiveTab("diff")} type="button">Git Diff</button>
              <button className={`tab-btn ${activeTab === "github" ? "active" : ""}`} onClick={() => setActiveTab("github")} type="button">GitHub PR</button>
            </div>
            {activeTab === "diff" ? (
              <div className="tab-panel active">
                <div className="form-row">
                  <label htmlFor="developerName">Developer Name (for analytics)</label>
                  <input id="developerName" type="text" placeholder="e.g. yash" value={developerName} onChange={e => setDeveloperName(e.target.value)} />
                </div>
                <div className="form-row">
                  <label htmlFor="providerSelect">AI Provider</label>
                  <select
                    id="providerSelect"
                    className="provider-select"
                    value={selectedProviderId || ""}
                    onChange={(e) => selectProvider(e.target.value)}
                  >
                    {providers.length === 0 && (
                      <option value="" disabled>Loading providers...</option>
                    )}
                    {providers.map((p) => {
                      const icon = p.configured ? "🟢" : "⚪";
                      const label = p.configured ? p.displayName : `${p.displayName} (not configured)`;
                      return (
                        <option key={p.providerId} value={p.providerId}>
                          {icon} {label} — {p.modelId}
                        </option>
                      );
                    })}
                  </select>
                  {selectedProviderId && providers.find(p => p.providerId === selectedProviderId && !p.configured) && (
                    <p className="provider-warning">⚠️ This provider is not configured. Set its API key to use it.</p>
                  )}
                </div>
                <label htmlFor="diffInput">Paste git diff / patch</label>
                <textarea id="diffInput" placeholder="Paste your diff here..." value={diffInput} onChange={e => setDiffInput(e.target.value)} />
              </div>
            ) : (
              <div className="tab-panel active">
                <div className="form-row">
                  <label htmlFor="githubToken">GitHub Token</label>
                  <input id="githubToken" type="password" placeholder="ghp_..." value={github.token} onChange={e => handleGithubField("token", e.target.value)} />
                </div>
                <div className="form-row two-col">
                  <div><label htmlFor="repoOwner">Owner</label><input id="repoOwner" type="text" placeholder="octocat" value={github.owner} onChange={e => handleGithubField("owner", e.target.value)} /></div>
                  <div><label htmlFor="repoName">Repo</label><input id="repoName" type="text" placeholder="hello-world" value={github.repo} onChange={e => handleGithubField("repo", e.target.value)} /></div>
                </div>
                <div className="form-row two-col">
                  <div><label htmlFor="prNumber">PR Number</label><input id="prNumber" type="number" min="1" placeholder="42" value={github.prNumber} onChange={e => handleGithubField("prNumber", e.target.value)} /></div>
                  <div className="align-end"><button className="btn btn-secondary" type="button" onClick={fetchPullRequestDiff} disabled={fetching}>{fetching ? "Fetching..." : "Fetch PR Diff"}</button></div>
                </div>
                <p className="note">Token is used only in your browser request.</p>
              </div>
            )}
            <div className="actions">
              <button className="btn btn-primary" type="button" onClick={handleAnalyze} disabled={analyzing || !diffInput.trim()}>{analyzing ? "Analyzing..." : "Analyze with AI"}</button>
              <button className="btn btn-ghost" type="button" onClick={handleClear} disabled={analyzing || fetching || improving || inlining}>Clear</button>
            </div>
          </section>

          <section className="card">
            {activePage === "review" && (
              <>
                <SummaryCard analysis={analysis} diffInsights={diffInsights} />
                <ProviderMetadataBar metadata={providerMeta} providers={providers} />
                <h2>Review Results</h2>
                <FilterBar allIssues={allIssues} activeSeverities={activeSeverities} onChange={setActiveSeverities} />
                <div className="result-grid">
                  <article className="result-card">
                    <h3>Bugs <span className="category-count">({filteredData.bugs.length})</span></h3>
                    <IssueList items={filteredData.bugs} getFixState={getFixState} onGenerateFix={generateFix} onPreviewFix={handlePreviewFix} />
                  </article>
                  <article className="result-card">
                    <h3>Security Issues <span className="category-count">({filteredData.security.length})</span></h3>
                    <IssueList items={filteredData.security} getFixState={getFixState} onGenerateFix={generateFix} onPreviewFix={handlePreviewFix} />
                  </article>
                  <article className="result-card">
                    <h3>Code Quality <span className="category-count">({filteredData.quality.length})</span></h3>
                    <IssueList items={filteredData.quality} getFixState={getFixState} onGenerateFix={generateFix} onPreviewFix={handlePreviewFix} />
                  </article>
                  <article className="result-card">
                    <h3>Suggested Improvements <span className="category-count">({filteredData.improvements.length})</span></h3>
                    <IssueList items={filteredData.improvements} getFixState={getFixState} onGenerateFix={generateFix} onPreviewFix={handlePreviewFix} />
                  </article>
                </div>
                <div className="actions">
                  <button className="btn btn-secondary" type="button" onClick={() => setActivePage("dashboard")} disabled={!analysis}>Open PR Dashboard</button>
                  <button className="btn btn-secondary" type="button" onClick={handleInlineReview} disabled={!diffInput.trim() || inlining}>{inlining ? "Loading..." : "Inline Review"}</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setActivePage("fileanalysis")} disabled={!diffInput.trim()}>File Analysis</button>
                  <button className="btn btn-secondary" type="button" onClick={handleGenerateImprovementPlan} disabled={!analysis || improving}>{improving ? "Generating..." : "Improvement Plan"}</button>
                </div>
              </>
            )}
          </section>
          </>
        )}
      </main>
      <FixPreviewModal fix={previewFix} issue={previewIssue} onAccept={handleCloseFixModal} onReject={handleCloseFixModal} />
    </div>
  );
}
