'use client';

import { useState } from 'react';
import QueryInterface, { QueryParams } from '@/components/QueryInterface';
import QueryResults from '@/components/QueryResults';
import ExampleQueries from '@/components/ExampleQueries';
import Link from 'next/link';

interface QueryResponse {
  status: string;
  query: string;
  answer: string;
  chunks: Array<{
    id: string;
    text: string;
    score: number;
    pmcid: string;
    pmid?: string;
    title: string;
    year: number;
    proteins: string[];
    theories: string[];
  }>;
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
  aging_relevance?: {
    has_aging_connection: boolean;
    relevance_score: number;
    connections: string[];
    aging_theories: string[];
  };
  is_general_query?: boolean;
}

export default function QueryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');

  const handleQuery = async (params: QueryParams) => {
    setCurrentQuery(params.query);
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const queryParams = new URLSearchParams({
        query: params.query,
        top_k: params.topK.toString(),
        synthesize: 'true',
      });

      if (params.proteinFilter) {
        queryParams.append('protein', params.proteinFilter);
      }

      if (params.theoryFilters && params.theoryFilters.length > 0) {
        params.theoryFilters.forEach(theory => {
          queryParams.append('theories', theory);
        });
      }

      // Use general RAG endpoint if no filters, otherwise use filtered endpoint
      const endpoint = (params.proteinFilter || (params.theoryFilters && params.theoryFilters.length > 0))
        ? 'rag'
        : 'rag-general';
      
      const response = await fetch(
        `http://localhost:8000/query/${endpoint}?${queryParams.toString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Query response:', data); // Debug log
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Query error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.45em] text-[var(--accent-primary)]">
                RAG Query
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Ask ANY question about proteins
              </h1>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                Search across 308 proteins and 7,018 papers - we'll find aging connections automatically
              </p>
            </div>
            <Link
              href="/"
              className="rounded-xl border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background)]"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="space-y-8">
          {/* Query Interface */}
          <QueryInterface onQuery={handleQuery} isLoading={isLoading} />

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-900">Query Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="rounded-3xl border border-[var(--border-color)] bg-white p-12 text-center shadow-[var(--shadow-soft)]">
              <div className="inline-flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
                <span className="text-sm font-medium text-[var(--foreground-muted)]">
                  Searching and synthesizing answer...
                </span>
              </div>
            </div>
          )}

          {/* Query Results */}
          {results && !isLoading && (
            <QueryResults
              answer={results.answer || ''}
              chunks={results.chunks || []}
              citations={results.citations || []}
              metadata={results.metadata || {
                confidence: 0,
                proteins_mentioned: [],
                theories_identified: [],
                query_time_ms: 0,
                filters_applied: {},
                chunks_retrieved: 0
              }}
              agingRelevance={results.aging_relevance}
              isGeneralQuery={results.is_general_query}
            />
          )}

          {/* Empty State with Example Queries */}
          {!results && !isLoading && !error && (
            <ExampleQueries onQuerySelect={(query) => {
              setCurrentQuery(query);
              handleQuery({ query, topK: 10 });
            }} />
          )}
        </div>
      </main>
    </div>
  );
}
