import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from "recharts";

const API_BASE_URL = "https://pr-review-ai-agent-pghm.onrender.com/api";
const RISK_HISTORY_KEY = "ai-review-risk-history";
const TEAM_ANALYTICS_KEY = "ai-review-team-analytics";

function IssueList({ items }) {
  if (!items.length) {
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
            <span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span>
            <strong>{item.title}</strong>
          </div>
          <p className="description">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("diff");
  const [activePage, setActivePage] = useState("review");
  const [diffInput, setDiffInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [improvementPlan, setImprovementPlan] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [developerName, setDeveloperName] = useState("");
  const [riskHistory, setRiskHistory] = useState([]);
  const [teamAnalytics, setTeamAnalytics] = useState({});
  const [github, setGithub] = useState({
    token: "",
    owner: "",
    repo: "",
    prNumber: ""
  });

  const reviewData = useMemo(
    () => analysis ?? { bugs: [], security: [], quality: [], improvements: [] },
    [analysis]
  );
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
      if (Array.isArray(savedHistory)) {
        setRiskHistory(savedHistory);
      }
      if (savedTeam && typeof savedTeam === "object") {
        setTeamAnalytics(savedTeam);
      }
    } catch {
      setRiskHistory([]);
      setTeamAnalytics({});
    }
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/review/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diffText: diffInput })
      });

      if (!response.ok) {
        throw new Error(await buildApiError(response, "Review API error"));
      }

      const data = await response.json();
      setAnalysis(data);
      setImprovementPlan(null);
      setActivePage("review");
      trackAnalytics(data);
    } catch (error) {
      window.alert(`Failed to analyze diff: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setDiffInput("");
    setAnalysis(null);
    setImprovementPlan(null);
    setActivePage("review");
  };

  const handleGithubField = (field, value) => {
    setGithub((prev) => ({ ...prev, [field]: value }));
  };

  const fetchPullRequestDiff = async () => {
    const { token, owner, repo, prNumber } = github;
    if (!token.trim() || !owner.trim() || !repo.trim() || !prNumber.trim()) {
      window.alert("Fill token, owner, repo, and PR number.");
      return;
    }

    setFetching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/github/pr-diff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, owner, repo, prNumber })
      });

      if (!response.ok) {
        throw new Error(await buildApiError(response, "Backend API error"));
      }

      const data = await response.json();
      setDiffInput(data.diffText ?? "");
      setAnalysis(null);
      setImprovementPlan(null);
      setActivePage("review");
      setActiveTab("diff");
    } catch (error) {
      window.alert(`Failed to fetch PR diff: ${error.message}`);
    } finally {
      setFetching(false);
    }
  };

  const handleGenerateImprovementPlan = async () => {
    if (!analysis) {
      window.alert("Run the AI analysis first.");
      return;
    }
    if (!diffInput.trim()) {
      window.alert("Please provide a diff before generating code improvements.");
      return;
    }

    setImproving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/review/improve-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diffText: diffInput, analysis })
      });

      if (!response.ok) {
        throw new Error(await buildApiError(response, "Code improvement API error"));
      }

      const data = await response.json();
      setImprovementPlan(data);
      setActivePage("improvements");
    } catch (error) {
      window.alert(`Failed to generate code improvements: ${error.message}`);
    } finally {
      setImproving(false);
    }
  };

  const buildApiError = async (response, label) => {
    const fallback = `${label}: ${response.status} ${response.statusText}`;
    try {
      const text = await response.text();
      if (!text?.trim()) {
        return fallback;
      }
      return `${fallback} - ${text}`;
    } catch {
      return fallback;
    }
  };

  const trackAnalytics = (result) => {
    const actor = developerName.trim() || github.owner.trim() || "Anonymous";
    const now = new Date().toISOString();
    const mistakes = [
      ...(result?.bugs || []).map((x) => x.title),
      ...(result?.security || []).map((x) => x.title),
      ...(result?.quality || []).map((x) => x.title)
    ];

    const historyEntry = {
      riskScore: result?.riskScore ?? 0,
      filesAffected: diffInsights.filesAffected,
      complexityScore: diffInsights.complexityScore,
      at: now
    };
    const nextHistory = [...riskHistory, historyEntry].slice(-30);
    setRiskHistory(nextHistory);
    localStorage.setItem(RISK_HISTORY_KEY, JSON.stringify(nextHistory));

    const existing = teamAnalytics[actor] || {
      totalReviews: 0,
      averageRisk: 0,
      lastRisk: 0,
      mistakes: {},
      trend: []
    };
    const totalReviews = existing.totalReviews + 1;
    const averageRisk = Math.round(((existing.averageRisk * existing.totalReviews) + (result?.riskScore ?? 0)) / totalReviews);
    const mistakeMap = { ...existing.mistakes };
    mistakes.forEach((title) => {
      const key = title || "Untitled issue";
      mistakeMap[key] = (mistakeMap[key] || 0) + 1;
    });
    const trend = [...(existing.trend || []), result?.riskScore ?? 0].slice(-10);
    const nextTeam = {
      ...teamAnalytics,
      [actor]: {
        totalReviews,
        averageRisk,
        lastRisk: result?.riskScore ?? 0,
        mistakes: mistakeMap,
        trend
      }
    };
    setTeamAnalytics(nextTeam);
    localStorage.setItem(TEAM_ANALYTICS_KEY, JSON.stringify(nextTeam));
  };

  function computeDiffInsights(diffText) {
    if (!diffText?.trim()) {
      return {
        filesAffected: 0,
        additions: 0,
        deletions: 0,
        complexityScore: 0,
        testCoverageSuggestion: "Add tests for new logic and edge cases.",
        files: [],
        fileTypeCounts: {}
      };
    }
    const lines = diffText.split("\n");
    let filesAffected = 0;
    let additions = 0;
    let deletions = 0;
    let hunks = 0;
    let touchedFunctions = 0;
    let testFilesTouched = 0;
    const files = [];
    const fileTypeCounts = {};

    for (const line of lines) {
      if (line.startsWith("diff --git ")) {
        filesAffected += 1;
        const parts = line.split(" ");
        const rightPath = normalizeDiffPath(parts[3] || "");
        if (rightPath) {
          files.push(rightPath);
          const ext = rightPath.includes(".") ? rightPath.split(".").pop().toLowerCase() : "no-ext";
          fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;
        }
        const normalized = rightPath.toLowerCase();
        if (normalized.includes("test") || normalized.includes("spec") || normalized.includes("__tests__")) {
          testFilesTouched += 1;
        }
      } else if (line.startsWith("@@")) {
        hunks += 1;
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        additions += 1;
        if (/\b(function|class|if|for|while|switch)\b/.test(line)) {
          touchedFunctions += 1;
        }
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions += 1;
      }
    }

    const complexityScore = Math.min(
      100,
      Math.round((filesAffected * 6) + (hunks * 3) + ((additions + deletions) / 8) + (touchedFunctions * 2))
    );
    const coverageBase = complexityScore > 70 ? 85 : complexityScore > 40 ? 70 : 55;
    const testCoverageSuggestion = testFilesTouched > 0
      ? `Target ~${Math.min(95, coverageBase + 5)}% coverage on changed modules; expand edge-case tests.`
      : `Target ~${coverageBase}% coverage; add unit + integration tests for changed files.`;

    return { filesAffected, additions, deletions, complexityScore, testCoverageSuggestion, files, fileTypeCounts };
  }

  const reportCharts = useMemo(() => {
    const current = analysis?.riskScore ?? 0;
    const findingsByCategory = [
      { name: "Bugs", value: reviewData.bugs.length },
      { name: "Security", value: reviewData.security.length },
      { name: "Quality", value: reviewData.quality.length },
      { name: "Improvements", value: reviewData.improvements.length }
    ];

    const severityCount = { High: 0, Medium: 0, Low: 0 };
    const allIssues = [
      ...(reviewData.bugs || []),
      ...(reviewData.security || []),
      ...(reviewData.quality || []),
      ...(reviewData.improvements || [])
    ];
    allIssues.forEach((i) => {
      const key = (i?.severity || "Low").toString();
      if (severityCount[key] == null) severityCount[key] = 0;
      severityCount[key] += 1;
    });
    const severityData = Object.entries(severityCount).map(([name, value]) => ({ name, value }));

    const churnData = [
      { name: "Additions", value: diffInsights.additions },
      { name: "Deletions", value: diffInsights.deletions }
    ];

    const trendData = riskTrend.map((x, idx) => ({
      name: `${idx + 1}`,
      riskScore: x.riskScore,
      complexity: x.complexityScore
    }));

    const fileTypeData = Object.entries(diffInsights.fileTypeCounts || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { current, findingsByCategory, severityData, churnData, trendData, fileTypeData };
  }, [analysis, diffInsights, reviewData, riskTrend]);

  const chartColors = {
    primary: "#5f8bff",
    high: "#ff6b7a",
    medium: "#ffbf66",
    low: "#4adf9a",
    soft: "#1a2540",
    grid: "#2a3354"
  };

  const topMistakesFor = (stats) => {
    const entries = Object.entries(stats?.mistakes || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!entries.length) {
      return "No recurring issues tracked yet.";
    }
    return entries.map(([k, v]) => `${k} (${v})`).join(", ");
  };

  function parseBeforeCodeByFile(diffText) {
    const map = new Map();
    if (!diffText?.trim()) {
      return map;
    }

    let currentFile = null;
    const lines = diffText.split("\n");

    for (const rawLine of lines) {
      const line = rawLine ?? "";

      if (line.startsWith("diff --git ")) {
        const parts = line.split(" ");
        const rightPath = parts[3] || "";
        const normalized = normalizeDiffPath(rightPath);
        currentFile = normalized || null;
        if (currentFile && !map.has(currentFile)) {
          map.set(currentFile, { removed: [], context: [] });
        }
        continue;
      }

      if (!currentFile || !map.has(currentFile)) {
        continue;
      }

      if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
        continue;
      }

      const entry = map.get(currentFile);
      if (line.startsWith("-")) {
        entry.removed.push(line.slice(1));
      } else if (line.startsWith(" ")) {
        entry.context.push(line.slice(1));
      }
    }

    const beforeCode = new Map();
    map.forEach((entry, file) => {
      const removedSnippet = entry.removed.filter(Boolean).slice(0, 140).join("\n").trim();
      const contextSnippet = entry.context.filter(Boolean).slice(0, 80).join("\n").trim();
      beforeCode.set(file, removedSnippet || contextSnippet || "");
    });

    return beforeCode;
  }

  function normalizeDiffPath(value) {
    if (!value) return "";
    if (value.startsWith("a/") || value.startsWith("b/")) {
      return value.slice(2);
    }
    return value;
  }

  function looksLikeCode(value) {
    return /[{}();=<>]|^\s*(import|package|class|public|private|const|let|function)\b/m.test(value || "");
  }

  const resolveBeforeCode = (change) => {
    const target = normalizeDiffPath(change?.filePath || "");
    if (target) {
      if (beforeCodeByFile.has(target)) {
        const snippet = beforeCodeByFile.get(target);
        if (snippet) return snippet;
      }

      for (const [path, snippet] of beforeCodeByFile.entries()) {
        if (path.endsWith(target) || target.endsWith(path)) {
          if (snippet) return snippet;
        }
      }
    }

    if (looksLikeCode(change?.beforeCode || "")) {
      return change.beforeCode;
    }
    return "";
  };

  const diffRowsForChange = (change) => {
    const code = resolveBeforeCode(change);
    const beforeLines = code ? code.split("\n") : [];
    const afterLines = change?.afterCode ? change.afterCode.split("\n") : [];

    const rows = [];
    let lineNumber = 1;

    beforeLines.forEach((line) => {
      rows.push({
        lineNumber: lineNumber++,
        type: "removed",
        code: line
      });
    });
    afterLines.forEach((line) => {
      rows.push({
        lineNumber: lineNumber++,
        type: "added",
        code: line
      });
    });
    return rows;
  };

  const isDashboardPage = activePage === "dashboard";
  const isImprovementsPage = activePage === "improvements";
  const isFullPage = isDashboardPage || isImprovementsPage;

  const dashboardSection = (
    <section className="card dashboard-page-card">
      <div className="page-header">
        <h2>PR Review Dashboard</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setActivePage("review")}>
          Back to Review
        </button>
      </div>

      <div className="analytics-grid">
        <article className="result-card">
          <h3>PR Review Report</h3>
          <div className="report-kpis">
            <div className="kpi">
              <p className="kpi-label">Risk Score</p>
              <p className="kpi-value">{analysis ? analysis.riskScore : "--"}</p>
            </div>
            <div className="kpi">
              <p className="kpi-label">Files Affected</p>
              <p className="kpi-value">{diffInsights.filesAffected}</p>
            </div>
            <div className="kpi">
              <p className="kpi-label">Complexity</p>
              <p className="kpi-value">{diffInsights.complexityScore}/100</p>
            </div>
            <div className="kpi">
              <p className="kpi-label">Churn</p>
              <p className="kpi-value">+{diffInsights.additions} / -{diffInsights.deletions}</p>
            </div>
          </div>

          <p className="metric-line"><strong>Test Coverage Suggestion:</strong> {diffInsights.testCoverageSuggestion}</p>

          <div className="chart-grid">
            <div className="chart-card">
              <h4>Risk Trend</h4>
              {!reportCharts.trendData.length ? (
                <p className="note">Run multiple analyses to see trend.</p>
              ) : (
                <div className="chart chart-tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportCharts.trendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#98a2c9" />
                      <YAxis stroke="#98a2c9" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="riskScore" stroke={chartColors.primary} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="complexity" stroke="#8b5cff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="chart-card">
              <h4>Findings by Category</h4>
              <div className="chart chart-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportCharts.findingsByCategory} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#98a2c9" />
                    <YAxis allowDecimals={false} stroke="#98a2c9" />
                    <Tooltip />
                    <Bar dataKey="value" fill={chartColors.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h4>Severity Distribution</h4>
              <div className="chart chart-pie">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={reportCharts.severityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {reportCharts.severityData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === "High"
                              ? chartColors.high
                              : entry.name === "Medium"
                              ? chartColors.medium
                              : chartColors.low
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h4>File Types (Top)</h4>
              <div className="chart chart-pie">
                {!reportCharts.fileTypeData.length ? (
                  <p className="note">Paste/fetch a diff to populate file stats.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportCharts.fileTypeData} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} stroke="#98a2c9" />
                      <YAxis type="category" dataKey="name" stroke="#98a2c9" width={60} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#38bdf8" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="result-card">
          <h3>Team Analytics</h3>
          {!analyticsRows.length ? (
            <p className="note">No developer analytics yet. Run analysis with a developer name.</p>
          ) : (
            <div className="team-list">
              {analyticsRows.map((row) => (
                <div className="team-item" key={row.name}>
                  <p className="metric-line"><strong>{row.name}</strong></p>
                  <p className="metric-line">Reviews: {row.totalReviews}</p>
                  <p className="metric-line">Avg Risk: {row.averageRisk}</p>
                  <p className="metric-line">Latest Risk: {row.lastRisk}</p>
                  <p className="metric-line">Common Mistakes: {topMistakesFor(row)}</p>
                  <p className="metric-line">
                    Improvement: {(row.trend?.length || 0) >= 2 ? `${row.trend[0] - row.trend[row.trend.length - 1]} pts` : "Need more data"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );

  const improvementsSection = (
    <section className="card dashboard-page-card">
      <div className="page-header">
        <h2>Code Improvement Review</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setActivePage("review")}>
          Back to Review
        </button>
      </div>
      <p className="subtitle-text">
        {improvementPlan?.summary ?? "Inline comments are attached to code lines based on the AI review findings."}
      </p>

      {!improvementPlan?.changes?.length ? (
        <p className="note">No concrete code changes were generated.</p>
      ) : (
        <div className="inline-review-grid">
          {improvementPlan.changes.map((change, index) => {
            const rows = diffRowsForChange(change);
            return (
              <article className="result-card inline-review-card" key={`${change.filePath}-${index}`}>
                <h3>{change.filePath || "Unknown file"}</h3>
                <p className="description">{change.rationale}</p>
                {!rows.length ? (
                  <p className="note">No code snippet found from diff for inline comments.</p>
                ) : (
                  <div className="inline-code-table">
                    {rows.map((row) => (
                      <div className="inline-code-row" key={`${change.filePath}-${row.lineNumber}`}>
                        <div className="inline-line-number">{row.lineNumber}</div>
                        <pre className={`inline-line-code ${row.type === "removed" ? "removed-line" : "added-line"}`}>
                          <span className="diff-prefix">{row.type === "removed" ? "-" : "+"}</span>
                          {row.code || " "}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="badge">AI Code Reviewer</p>
          <h1>Review PRs in seconds, not hours.</h1>
          <p className="subtitle">
            Paste a git diff or pull directly from GitHub, then run an AI-assisted review for bugs, security, code
            quality, and improvement suggestions.
          </p>
        </div>
      </header>

      <main className={isFullPage ? "dashboard-main" : "content-grid"}>
        {isDashboardPage ? dashboardSection : isImprovementsPage ? improvementsSection : (
        <>
        <section className="card">
          <h2>Input</h2>
          <div className="tabs" role="tablist" aria-label="Input source">
            <button
              className={`tab-btn ${activeTab === "diff" ? "active" : ""}`}
              onClick={() => setActiveTab("diff")}
              type="button"
            >
              Git Diff
            </button>
            <button
              className={`tab-btn ${activeTab === "github" ? "active" : ""}`}
              onClick={() => setActiveTab("github")}
              type="button"
            >
              GitHub PR
            </button>
          </div>

          {activeTab === "diff" ? (
            <div className="tab-panel active">
              <div className="form-row">
                <label htmlFor="developerName">Developer Name (for analytics)</label>
                <input
                  id="developerName"
                  type="text"
                  placeholder="e.g. yash"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                />
              </div>
              <label htmlFor="diffInput">Paste git diff / patch</label>
              <textarea
                id="diffInput"
                placeholder="Paste your diff here..."
                value={diffInput}
                onChange={(e) => setDiffInput(e.target.value)}
              />
            </div>
          ) : (
            <div className="tab-panel active">
              <div className="form-row">
                <label htmlFor="githubToken">GitHub Token</label>
                <input
                  id="githubToken"
                  type="password"
                  placeholder="ghp_..."
                  value={github.token}
                  onChange={(e) => handleGithubField("token", e.target.value)}
                />
              </div>
              <div className="form-row two-col">
                <div>
                  <label htmlFor="repoOwner">Owner</label>
                  <input
                    id="repoOwner"
                    type="text"
                    placeholder="octocat"
                    value={github.owner}
                    onChange={(e) => handleGithubField("owner", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="repoName">Repo</label>
                  <input
                    id="repoName"
                    type="text"
                    placeholder="hello-world"
                    value={github.repo}
                    onChange={(e) => handleGithubField("repo", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row two-col">
                <div>
                  <label htmlFor="prNumber">PR Number</label>
                  <input
                    id="prNumber"
                    type="number"
                    min="1"
                    placeholder="42"
                    value={github.prNumber}
                    onChange={(e) => handleGithubField("prNumber", e.target.value)}
                  />
                </div>
                <div className="align-end">
                  <button className="btn btn-secondary" type="button" onClick={fetchPullRequestDiff} disabled={fetching}>
                    {fetching ? "Fetching..." : "Fetch PR Diff"}
                  </button>
                </div>
              </div>
              <p className="note">Token is used only in your browser request. For production, proxy this via a secure backend.</p>
            </div>
          )}

          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </section>

        <section className="card">
          {activePage === "review" && (
            <>
              <h2>Review Results</h2>
              <div className="score-wrap">
                <p>Overall Risk Score</p>
                <div className="score">
                  <span>{analysis ? analysis.riskScore : "--"}</span>
                  <small>/100</small>
                </div>
              </div>

              <div className="result-grid">
                <article className="result-card">
                  <h3>Bugs</h3>
                  <IssueList items={reviewData.bugs} />
                </article>
                <article className="result-card">
                  <h3>Security Issues</h3>
                  <IssueList items={reviewData.security} />
                </article>
                <article className="result-card">
                  <h3>Code Quality</h3>
                  <IssueList items={reviewData.quality} />
                </article>
                <article className="result-card">
                  <h3>Suggested Improvements</h3>
                  <IssueList items={reviewData.improvements} />
                </article>
              </div>

              <div className="actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setActivePage("dashboard")}
                  disabled={!analysis}
                >
                  Open PR Dashboard
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleGenerateImprovementPlan}
                  disabled={!analysis || improving}
                >
                  {improving ? "Generating Changes..." : "View Code Improvements"}
                </button>
              </div>
            </>
          )}
        </section>
        </>
        )}
      </main>
    </div>
  );
}
