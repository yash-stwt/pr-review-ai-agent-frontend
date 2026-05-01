import { useMemo, useState } from "react";

const API_BASE_URL = "https://pr-review-ai-agent-pghm.onrender.com/api";

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

      <main className="content-grid">
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
          {activePage === "review" ? (
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
                  onClick={handleGenerateImprovementPlan}
                  disabled={!analysis || improving}
                >
                  {improving ? "Generating Changes..." : "View Code Improvements"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="page-header">
                <h2>Code Improvement Changes</h2>
                <button className="btn btn-ghost" type="button" onClick={() => setActivePage("review")}>
                  Back to Review
                </button>
              </div>
              <p className="subtitle-text">
                {improvementPlan?.summary ?? "AI generated code changes are shown below based on the review analysis."}
              </p>

              {!improvementPlan?.changes?.length ? (
                <p className="note">No concrete code changes were generated.</p>
              ) : (
                <div className="change-grid">
                  {improvementPlan.changes.map((change, index) => (
                    <article className="result-card change-card" key={`${change.filePath}-${index}`}>
                      <h3>{change.filePath || "Unknown file"}</h3>
                      <p className="description">{change.rationale}</p>
                      <div className="code-block-wrap">
                        <h4>Before</h4>
                        <pre>{resolveBeforeCode(change)}</pre>
                      </div>
                      <div className="code-block-wrap">
                        <h4>After</h4>
                        <pre>{change.afterCode || "Not provided by AI."}</pre>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
