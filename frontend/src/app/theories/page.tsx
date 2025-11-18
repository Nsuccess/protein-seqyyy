'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

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
      const response = await fetch('http://localhost:8000/theories/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching theory stats:', error);
    }
  };

  const fetchTheories = async (query = '', confidence = '') => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/theories?limit=50';
      if (query) {
        url = `http://localhost:8000/theories/search?q=${encodeURIComponent(query)}&limit=50`;
      } else if (confidence) {
        url = `http://localhost:8000/theories?confidence=${confidence}&limit=50`;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-8 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Aging Theory Database
          </h1>
          <p className="text-lg text-gray-600">
            Explore {stats?.unique_theory_names || 823} unique aging theories extracted from {stats?.total_papers || 6153} research papers
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-600">{stats.total_theories.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">Total Theory Instances</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="text-3xl font-bold text-purple-600">{stats.unique_theory_names}</div>
              <div className="text-sm text-gray-600 mt-1">Unique Theories</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-600">{stats.total_papers.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">Research Papers</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="text-3xl font-bold text-orange-600">{stats.confidence_distribution.high || 0}</div>
              <div className="text-sm text-gray-600 mt-1">High Confidence</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search theories by name or concept..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              {(searchQuery || confidenceFilter) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="flex gap-2">
            <span className="text-sm text-gray-600 py-2">Filter by confidence:</span>
            <button
              onClick={() => handleConfidenceFilter('high')}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${
                confidenceFilter === 'high'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              High
            </button>
            <button
              onClick={() => handleConfidenceFilter('medium')}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${
                confidenceFilter === 'medium'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              Medium
            </button>
          </div>
        </div>

        {/* Top Theories */}
        {stats && !searchQuery && !confidenceFilter && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔥 Top Aging Theories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.top_theories.slice(0, 10).map((theory, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setSearchQuery(theory.name);
                    fetchTheories(theory.name, '');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                    <div className="font-medium text-gray-900">{theory.name}</div>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {theory.count} papers
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchQuery ? `Search Results for "${searchQuery}"` : confidenceFilter ? `${confidenceFilter.charAt(0).toUpperCase() + confidenceFilter.slice(1)} Confidence Theories` : 'All Theories'}
            </h2>
            <div className="text-sm text-gray-600">
              Showing {theories.length} of {total.toLocaleString()} results
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading theories...</p>
            </div>
          ) : theories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No theories found. Try a different search term.
            </div>
          ) : (
            <div className="space-y-4">
              {theories.map((theory) => (
                <div
                  key={theory.theory_id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{theory.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        theory.confidence === 'high'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {theory.confidence}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3 line-clamp-2">{theory.paper_title}</p>
                  
                  {theory.concept_summary && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">Key Concepts:</div>
                      <div className="text-sm text-blue-800">{theory.concept_summary}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
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
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Paper →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
