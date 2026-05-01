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
  const [diffInput, setDiffInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
        throw new Error(`Review API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      window.alert(`Failed to analyze diff: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setDiffInput("");
    setAnalysis(null);
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
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDiffInput(data.diffText ?? "");
      setActiveTab("diff");
    } catch (error) {
      window.alert(`Failed to fetch PR diff: ${error.message}`);
    } finally {
      setFetching(false);
    }
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
        </section>
      </main>
    </div>
  );
}
