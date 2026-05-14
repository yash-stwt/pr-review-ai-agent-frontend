/**
 * Horizontal metadata bar showing provider info after an analysis completes.
 * Displays providerId, modelId, latency, and estimated token cost.
 */
export default function ProviderMetadataBar({ metadata, providers }) {
  if (!metadata) return null;

  const { providerId, modelId, latencyMs, tokenUsage } = metadata;

  // Look up cost from providers list
  const provider = providers?.find((p) => p.providerId === providerId);
  const costPer1k = provider?.estimatedCostPer1kTokens ?? 0;
  const totalTokens = tokenUsage?.totalTokens ?? 0;
  const estimatedCost = ((totalTokens / 1000) * costPer1k).toFixed(4);

  return (
    <div className="provider-meta-bar">
      <span className="provider-meta-item">
        <span className="provider-meta-label">Provider</span>
        <span className="provider-meta-value">{providerId}</span>
      </span>
      <span className="provider-meta-item">
        <span className="provider-meta-label">Model</span>
        <span className="provider-meta-value">{modelId}</span>
      </span>
      <span className="provider-meta-item">
        <span className="provider-meta-label">Latency</span>
        <span className="provider-meta-value">{latencyMs}ms</span>
      </span>
      <span className="provider-meta-item">
        <span className="provider-meta-label">Tokens</span>
        <span className="provider-meta-value">{totalTokens}</span>
      </span>
      <span className="provider-meta-item">
        <span className="provider-meta-label">Cost</span>
        <span className="provider-meta-value">~${estimatedCost}</span>
      </span>
    </div>
  );
}
