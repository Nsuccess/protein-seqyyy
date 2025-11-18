'use client';

interface AgingRelevanceBadgeProps {
  score: number;
  connections: string[];
  theories: string[];
  isGeneralQuery?: boolean;
}

export default function AgingRelevanceBadge({ 
  score, 
  connections, 
  theories,
  isGeneralQuery = false 
}: AgingRelevanceBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
  };

  // Don't show if no connections found
  if (connections.length === 0 && theories.length === 0 && score === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-md">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">🧬</span>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Aging Relevance
            </h3>
            <div className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-semibold ${getScoreColor(score)}`}>
              <span>{getScoreLabel(score)}</span>
              <span>({(score * 100).toFixed(0)}%)</span>
            </div>
          </div>
          {isGeneralQuery && (
            <p className="text-xs text-[var(--foreground-subtle)] italic">
              This was a general query - aging connections identified automatically
            </p>
          )}
        </div>
      </div>

      {connections.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
            Connections to Aging:
          </h4>
          <ul className="space-y-1.5">
            {connections.map((conn, idx) => (
              <li key={idx} className="text-sm text-[var(--foreground-muted)] flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>{conn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {theories.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
            Related Aging Theories:
          </h4>
          <div className="flex flex-wrap gap-2">
            {theories.map(theory => (
              <span
                key={theory}
                className="rounded-lg bg-white border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700"
              >
                {theory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}

      {connections.length === 0 && theories.length === 0 && (
        <p className="text-sm text-[var(--foreground-subtle)] italic">
          No direct aging connections identified in the current results.
        </p>
      )}
    </div>
  );
}
