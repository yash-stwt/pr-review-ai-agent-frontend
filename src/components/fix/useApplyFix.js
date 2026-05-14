import { useState, useCallback } from "react";

const API_BASE_URL = "http://localhost:8081/api";

/**
 * Hook managing the fix request lifecycle for multiple findings.
 * Returns fixState (keyed by finding key), generateFix, and clearFix.
 */
export function useApplyFix(diffText) {
  const [fixState, setFixState] = useState({});

  const getKey = (issue) => `${issue.filePath}:${issue.lineNumber}:${issue.title}`;

  const generateFix = useCallback(async (issue) => {
    const key = getKey(issue);
    setFixState((prev) => ({ ...prev, [key]: { status: "loading", fix: null, error: null } }));

    try {
      const res = await fetch(`${API_BASE_URL}/review/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffText,
          filePath: issue.filePath,
          lineNumber: issue.lineNumber,
          findingTitle: issue.title,
          findingDescription: issue.description,
          severity: issue.severity,
          forceGenerate: false,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        let errorMsg = `Fix generation failed (${res.status})`;
        try {
          const parsed = JSON.parse(errorBody);
          errorMsg = parsed.message || parsed.errorCode || errorMsg;
        } catch { /* use default */ }
        setFixState((prev) => ({ ...prev, [key]: { status: "error", fix: null, error: errorMsg } }));
        return;
      }

      const fix = await res.json();
      setFixState((prev) => ({ ...prev, [key]: { status: "success", fix, error: null } }));
    } catch (e) {
      setFixState((prev) => ({ ...prev, [key]: { status: "error", fix: null, error: e.message } }));
    }
  }, [diffText]);

  const clearFix = useCallback((issue) => {
    const key = getKey(issue);
    setFixState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const getFixState = useCallback((issue) => {
    if (!issue?.filePath || !issue?.lineNumber) return null;
    const key = getKey(issue);
    return fixState[key] || { status: "idle", fix: null, error: null };
  }, [fixState]);

  return { fixState, generateFix, clearFix, getFixState };
}
