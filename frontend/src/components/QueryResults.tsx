'use client';

import { useState } from 'react';
import AgingRelevanceBadge from './AgingRelevanceBadge';

interface Chunk {
  id: string;
  text: string;
  score: number;
  pmcid: string;
  pmid?: string;
  title: string;
  year: number;
  proteins: string[];
  theories: string[];
}

interface QueryResultsProps {
  answer: string;
  chunks: Chunk[];
  citations: string[];
  metadata: {
    confidence: number;
    proteins_mentioned: string[];
    theories_identified: string[];
    query_time_ms: number;
    filters_applied: {
      protein?: string;
      theories?: string[];
    };
    chunks_retrieved: number;
  };
  agingRelevance?: {
    has_aging_connection: boolean;
    relevance_score: number;
    connections: string[];
    aging_theories: string[];
  };
  isGeneralQuery?: boolean;
}

export default function QueryResults({ answer, chunks, citations, metadata, agingRelevance, isGeneralQuery }: QueryResultsProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Safety checks
  if (!answer || !chunks || !citations || !metadata) {
    return <div>Loading results...</div>;
  }

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatQueryTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const toggleChunk = (id: string) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedChunks(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedChunks(new Set());
    } else {
      setExpandedChunks(new Set(chunks.map(c => c.id)));
    }
    setExpandAll(!expandAll);
  };

  const isExpanded = (id: string) => expandAll || expandedChunks.has(id);



  return (
    <div className="space-y-6">
      {/* Metadata Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--background-elevated)] px-6 py-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--foreground-subtle)]">Confidence:</span>
          <span className="font-semibold text-[var(--accent-primary)]">
            {formatConfidence(metadata.confidence)}
          </span>
        </div>
        <div className="h-4 w-px bg-[var(--border-color)]" />
        <div className="flex items-center gap-2">
          <span className="text-[var(--foreground-subtle)]">Query time:</span>
          <span className="font-medium text-[var(--foreground)]">
            {formatQueryTime(metadata.query_time_ms)}
          </span>
        </div>
        <div className="h-4 w-px bg-[var(--border-color)]" />
        <div className="flex items-center gap-2">
          <span className="text-[var(--foreground-subtle)]">Sources:</span>
          <span className="font-medium text-[var(--foreground)]">
            {metadata.chunks_retrieved}
          </span>
        </div>
        {metadata.proteins_mentioned.length > 0 && (
          <>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground-subtle)]">Proteins:</span>
              <div className="flex flex-wrap gap-1">
                {metadata.proteins_mentioned.map(protein => (
                  <span
                    key={protein}
                    className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent-primary)]"
                  >
                    {protein}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Synthesized Answer */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-[var(--accent-primary)] p-2.5">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Answer</h2>
        </div>
        <div className="prose prose-sm max-w-none text-[var(--foreground-muted)] leading-relaxed">
          {answer}
        </div>
        
        {/* Aging Relevance Badge */}
        {agingRelevance && (
          <div className="mt-6">
            <AgingRelevanceBadge
              score={agingRelevance.relevance_score}
              connections={agingRelevance.connections}
              theories={agingRelevance.aging_theories}
              isGeneralQuery={isGeneralQuery}
            />
          </div>
        )}
        
        {/* Citations - Enhanced Visibility */}
        {citations.length > 0 && (
          <div className="mt-6 rounded-xl border-2 border-[var(--accent-primary)] bg-gradient-to-r from-blue-50 to-purple-50 p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Sources ({citations.length} papers)
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {citations.map((citation, index) => {
                // Handle both string and object citations
                const pmid = typeof citation === 'string' ? citation : (citation as any).pmid || (citation as any).id;
                return (
                  <a
                    key={index}
                    href={`https://europepmc.org/article/MED/${pmid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-2 rounded-xl border-2 border-[var(--accent-primary)] bg-white px-4 py-3 text-sm font-semibold text-[var(--accent-primary)] shadow-md transition-all hover:scale-105 hover:shadow-lg hover:bg-[var(--accent-primary)] hover:text-white"
                  >
                    <span className="text-lg">📄</span>
                    <span>PMID: {pmid}</span>
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Retrieved Chunks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Retrieved Sources ({chunks.length})
            </h2>
          </div>
          <button
            onClick={toggleExpandAll}
            className="rounded-lg border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <div className="space-y-3">
          {chunks.map((chunk, index) => {
            const expanded = isExpanded(chunk.id);
            return (
              <div
                key={chunk.id}
                className="rounded-2xl border border-[var(--border-color)] bg-white shadow-[var(--shadow-soft)] transition-all hover:shadow-md overflow-hidden"
              >
                {/* Chunk Header - Always Visible */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-primary)]">
                          #{index + 1}
                        </span>
                        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          Score: {(chunk.score * 100).toFixed(1)}%
                        </span>
                        {/* Year Badge - Highlight recent papers */}
                        {chunk.year >= new Date().getFullYear() - 5 ? (
                          <span className="rounded-full bg-blue-100 border border-blue-300 px-2.5 py-0.5 text-xs font-semibold text-blue-700 flex items-center gap-1">
                            <span>✨</span>
                            <span>{chunk.year} (Recent)</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {chunk.year}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-[var(--foreground)] leading-snug">
                        {chunk.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-subtle)]">
                        <span>{chunk.year}</span>
                        {chunk.pmid && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://europepmc.org/article/MED/${chunk.pmid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--accent-primary)] hover:underline"
                            >
                              PMID: {chunk.pmid}
                            </a>
                          </>
                        )}
                        {chunk.pmcid && (
                          <>
                            <span>•</span>
                            <span>{chunk.pmcid}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleChunk(chunk.id)}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-2 hover:bg-[var(--accent-soft)] transition-colors"
                      aria-label={expanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`h-5 w-5 text-[var(--foreground)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {expanded && (
                  <div className="px-6 pb-6 border-t border-[var(--border-color)] pt-4">
                    {/* Chunk Text */}
                    <div className="text-sm text-[var(--foreground-muted)] leading-relaxed mb-4">
                      {chunk.text}
                    </div>

                    {/* Chunk Metadata */}
                    <div className="flex flex-wrap gap-2">
                      {chunk.proteins.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[var(--foreground-subtle)]">Proteins:</span>
                          {chunk.proteins.map(protein => (
                            <span
                              key={protein}
                              className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent-primary)]"
                            >
                              {protein}
                            </span>
                          ))}
                        </div>
                      )}
                      {chunk.theories.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[var(--foreground-subtle)]">Theories:</span>
                          {chunk.theories.slice(0, 3).map(theory => (
                            <span
                              key={theory}
                              className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
                            >
                              {theory.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {chunk.theories.length > 3 && (
                            <span className="text-xs text-[var(--foreground-subtle)]">
                              +{chunk.theories.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Theories Identified */}
      {metadata.theories_identified.length > 0 && (
        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🧬</span>
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Aging Theories Identified
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {metadata.theories_identified.map(theory => (
              <span
                key={theory}
                className="rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-sm font-medium text-purple-700"
              >
                {theory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
