'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiEndpoint } from '@/lib/api';

interface Theory {
  theory_id: string;
  name: string;
  confidence: string;
  paper_title: string;
  pmid: string;
  doi: string;
  key_concepts_count: number;
  concept_summary: string;
}

interface TheoryStats {
  total_theories: number;
  unique_theory_names: number;
  total_papers: number;
  confidence_distribution: Record<string, number>;
  top_theories: Array<{ name: string; count: number }>;
}

export default function TheoriesPage() {
  const [theories, setTheories] = useState<Theory[]>([]);
  const [stats, setStats] = useState<TheoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchTheories();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(apiEndpoint('/theories/stats'));
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching theory stats:', error);
    }
  };

  const fetchTheories = async (query = '', confidence = '') => {
    setLoading(true);
    try {
      let url = apiEndpoint('/theories?limit=50');
      if (query) {
        url = apiEndpoint(`/theories/search?q=${encodeURIComponent(query)}&limit=50`);
      } else if (confidence) {
        url = apiEndpoint(`/theories?confidence=${confidence}&limit=50`);
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (query) {
        setTheories(data.theories || []);
        setTotal(data.total_results || 0);
      } else {
        setTheories(data.theories || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching theories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTheories(searchQuery, confidenceFilter);
  };

  const handleConfidenceFilter = (confidence: string) => {
    setConfidenceFilter(confidence);
    setSearchQuery('');
    fetchTheories('', confidence);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setConfidenceFilter('');
    fetchTheories();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🧬</span>
              </div>
              <span className="text-lg font-semibold">AgingProteins.ai</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/proteins" className="text-sm text-slate-400 hover:text-white transition-colors">Proteins</Link>
              <Link href="/query" className="text-sm text-slate-400 hover:text-white transition-colors">Search</Link>
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0d1525]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-xs font-medium uppercase tracking-widest text-purple-400 mb-2">Research Database</p>
          <h1 className="text-3xl font-bold">Aging Theory Database</h1>
          <p className="mt-2 text-slate-400">
            Explore {stats?.unique_theory_names || 823} unique aging theories extracted from {stats?.total_papers || 6153} research papers
          </p>
        </div>
      </header>


      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Statistics Cards */}
        {stats && (
          <section className="grid gap-4 sm:grid-cols-4 mb-8">
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
              <p className="text-sm text-slate-500">Total Instances</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">{stats.total_theories.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
              <p className="text-sm text-slate-500">Unique Theories</p>
              <p className="mt-2 text-3xl font-bold text-purple-400">{stats.unique_theory_names}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
              <p className="text-sm text-slate-500">Research Papers</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.total_papers.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
              <p className="text-sm text-slate-500">High Confidence</p>
              <p className="mt-2 text-3xl font-bold text-orange-400">{stats.confidence_distribution.high || 0}</p>
            </div>
          </section>
        )}

        {/* Search and Filters */}
        <section className="rounded-2xl border border-white/10 bg-[#0d1525] p-6 mb-6">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search theories by name or concept..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                Search
              </button>
              {(searchQuery || confidenceFilter) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-6 py-3 bg-white/10 text-slate-300 rounded-xl hover:bg-white/20 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-500">Filter by confidence:</span>
            <button
              onClick={() => handleConfidenceFilter('high')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                confidenceFilter === 'high'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              High
            </button>
            <button
              onClick={() => handleConfidenceFilter('medium')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                confidenceFilter === 'medium'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              }`}
            >
              Medium
            </button>
          </div>
        </section>

        {/* Top Theories */}
        {stats && !searchQuery && !confidenceFilter && (
          <section className="rounded-2xl border border-white/10 bg-[#0d1525] p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🔥</span> Top Aging Theories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.top_theories.slice(0, 10).map((theory, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                  onClick={() => {
                    setSearchQuery(theory.name);
                    fetchTheories(theory.name, '');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold text-slate-600">#{index + 1}</div>
                    <div className="font-medium text-white">{theory.name}</div>
                  </div>
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
                    {theory.count} papers
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        <section className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {searchQuery ? `Search Results for "${searchQuery}"` : confidenceFilter ? `${confidenceFilter.charAt(0).toUpperCase() + confidenceFilter.slice(1)} Confidence Theories` : 'All Theories'}
            </h2>
            <div className="text-sm text-slate-500">
              Showing {theories.length} of {total.toLocaleString()} results
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-slate-400">Loading theories...</p>
            </div>
          ) : theories.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No theories found. Try a different search term.
            </div>
          ) : (
            <div className="space-y-4">
              {theories.map((theory) => (
                <div
                  key={theory.theory_id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-white">{theory.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        theory.confidence === 'high'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {theory.confidence}
                    </span>
                  </div>
                  
                  <p className="text-slate-400 mb-3 line-clamp-2">{theory.paper_title}</p>
                  
                  {theory.concept_summary && (
                    <div className="mb-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="text-sm font-medium text-purple-300 mb-1">Key Concepts:</div>
                      <div className="text-sm text-purple-200">{theory.concept_summary}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PMID: {theory.pmid}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {theory.key_concepts_count} concepts
                    </span>
                    {theory.doi && (
                      <a
                        href={`https://doi.org/${theory.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 hover:underline"
                      >
                        View Paper →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
