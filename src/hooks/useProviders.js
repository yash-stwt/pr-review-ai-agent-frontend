import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "http://localhost:8081/api";

/**
 * Hook for fetching and managing AI provider selection.
 * Returns all providers (configured and unconfigured), loading state,
 * selected provider, and select function.
 */
export function useProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/providers`);
      if (!res.ok) throw new Error(`Failed to fetch providers: ${res.status}`);
      const data = await res.json();
      setProviders(data);
      // Default to first configured provider
      const available = data.find((p) => p.configured);
      if (available && !selectedProviderId) {
        setSelectedProviderId(available.providerId);
      }
    } catch (e) {
      setError(e.message);
      // Fallback so the dropdown always shows something
      setProviders([
        {
          providerId: "groq",
          displayName: "Groq (Fast)",
          modelId: "llama-3.3-70b-versatile",
          status: "AVAILABLE",
          configured: true,
          averageLatencyMs: 0,
          estimatedCostPer1kTokens: 0.0006,
        },
      ]);
      setSelectedProviderId("groq");
    } finally {
      setLoading(false);
    }
  };

  const selectProvider = useCallback((providerId) => {
    setSelectedProviderId(providerId);
    // Fire-and-forget — just validates the provider exists on the backend
    fetch(`${API_BASE_URL}/providers/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    }).catch(() => {});
  }, []);

  return { providers, loading, error, selectedProviderId, selectProvider, refetch: fetchProviders };
}
