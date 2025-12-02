'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QueryInterface, { QueryParams } from '@/components/QueryInterface';
import QueryResults from '@/components/QueryResults';
import ExampleQueries from '@/components/ExampleQueries';
import Link from 'next/link';
import { apiEndpoint } from '@/lib/api';

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

function QueryPageContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [initialQueryExecuted, setInitialQueryExecuted] = useState(false);

  useEffect(() => {
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl && !initialQueryExecuted) {
      setCurrentQuery(queryFromUrl);
      setInitialQueryExecuted(true);
      handleQueryInternal({ query: queryFromUrl, topK: 10 });
    }
  }, [searchParams, initialQueryExecuted]);

  const handleQueryInternal = async (params: QueryParams) => {
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

      const endpoint = (params.proteinFilter || (params.theoryFilters && params.theoryFilters.length > 0))
        ? 'rag'
        : 'rag-general';
      
      const response = await fetch(
        apiEndpoint(`/query/${endpoint}?${queryParams.toString()}`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = (params: QueryParams) => {
    handleQueryInternal(params);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🧬</span>
              </div>
              <span className="text-lg font-semibold text-white">AgingProteins.ai</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/proteins" className="text-sm text-slate-400 hover:text-white transition-colors">Proteins</Link>
              <Link href="/theories" className="text-sm text-slate-400 hover:text-white transition-colors">Theories</Link>
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0d1525]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400 mb-2">
            AI-Powered Search
          </p>
          <h1 className="text-3xl font-bold text-white mb-2">
            Ask any question about aging proteins
          </h1>
          <p className="text-slate-400">
            Search across 308 proteins and 7,018 papers — we will find aging connections automatically
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="space-y-8">
          <QueryInterface onQuery={handleQuery} isLoading={isLoading} />

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-start gap-3">
                <span className="text-red-400">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-300">Query Error</h3>
                  <p className="mt-1 text-sm text-red-400">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-3 text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <span className="text-sm font-medium text-slate-400">
                  Searching and synthesizing answer...
                </span>
              </div>
            </div>
          )}

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

export default function QueryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <QueryPageContent />
    </Suspense>
  );
}
