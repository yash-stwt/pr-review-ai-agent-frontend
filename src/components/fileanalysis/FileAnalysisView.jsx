import { useState, useEffect, useRef } from "react";
import PRAnalysisSummary from "./PRAnalysisSummary";
import FileAnalysisCard from "./FileAnalysisCard";

const API_BASE_URL = "http://localhost:8081/api";

/**
 * Top-level file-wise analysis view.
 * Calls POST /api/review/analyze-files, handles sync (200) and async (202 + polling).
 */
export default function FileAnalysisView({ diffText, onBack }) {
  const [status, setStatus] = useState("loading"); // loading | polling | complete | error
  const [progress, setProgress] = useState(0);
  const [prAnalysis, setPrAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    startAnalysis();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/review/analyze-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diffText }),
      });

      if (res.status === 200) {
        const data = await res.json();
        setPrAnalysis(data);
        setStatus("complete");
      } else if (res.status === 202) {
        const data = await res.json();
        setStatus("polling");
        startPolling(data.jobId);
      } else {
        const text = await res.text();
        setErrorMsg(`Analysis failed: ${res.status} ${text}`);
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg(`Network error: ${e.message}`);
      setStatus("error");
    }
  };

  const startPolling = (jobId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/review/analyze-files/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        setProgress(data.progress || 0);

        if (data.status === "COMPLETE" && data.result) {
          clearInterval(pollingRef.current);
          setPrAnalysis(data.result);
          setStatus("complete");
        } else if (data.status === "FAILED") {
          clearInterval(pollingRef.current);
          setErrorMsg("Analysis job failed.");
          setStatus("error");
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 3000);
  };

  return (
    <section className="card dashboard-page-card">
      <div className="page-header">
        <h2>File-Wise Analysis</h2>
        <button className="btn btn-ghost" type="button" onClick={onBack}>Back to Review</button>
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div className="file-analysis-loading">
          <div className="file-analysis-spinner" />
          <p>Analyzing files independently...</p>
        </div>
      )}

      {/* Polling state */}
      {status === "polling" && (
        <div className="file-analysis-loading">
          <div className="file-analysis-progress-bar">
            <div className="file-analysis-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>Processing files... {progress}% complete</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="file-card-error" style={{ margin: "14px 0" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Complete state */}
      {status === "complete" && prAnalysis && (
        <>
          <PRAnalysisSummary prAnalysis={prAnalysis} />
          <div className="file-analysis-list">
            {prAnalysis.fileAnalyses?.map((fileResult) => (
              <FileAnalysisCard key={fileResult.filePath} fileResult={fileResult} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
