/**
 * Centralized API service layer
 * Handles all API calls with built-in error handling
 */

import { handleApiResponse, safeJsonParse } from './errorHandler';

const API_BASE_URL = 'http://localhost:8081/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  // Handle API response errors
  const { error, shouldThrow } = await handleApiResponse(response, `${config.method} ${endpoint}`);
  if (shouldThrow) {
    throw error;
  }

  // Parse response JSON safely
  const data = await response.json();
  return data;
}

/**
 * Review Analysis API
 * POST /review/analyze
 */
export async function analyzeReview(diffText, preferredProviderId = null) {
  return apiFetch('/review/analyze', {
    body: JSON.stringify({ diffText, preferredProviderId }),
  });
}

/**
 * Generate Code Improvement Plan
 * POST /review/improve-code
 */
export async function generateImprovementPlan(diffText, analysis) {
  return apiFetch('/review/improve-code', {
    body: JSON.stringify({ diffText, analysis }),
  });
}

/**
 * Generate Inline Review
 * POST /review/inline
 */
export async function generateInlineReview(diffText) {
  return apiFetch('/review/inline', {
    body: JSON.stringify({ diffText }),
  });
}

/**
 * Fetch Pull Request Diff from GitHub
 * POST /github/pr-diff
 */
export async function fetchPullRequestDiff(token, owner, repo, prNumber) {
  return apiFetch('/github/pr-diff', {
    body: JSON.stringify({ token, owner, repo, prNumber }),
  });
}
