'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

export interface QueryParams {
  query: string;
  proteinFilter?: string;
  theoryFilters?: string[];
  topK: number;
}

interface QueryInterfaceProps {
  onQuery: (params: QueryParams) => void;
  isLoading?: boolean;
}

const AGING_THEORIES = [
  { id: 'genomic_instability', label: 'Genomic Instability' },
  { id: 'telomere_attrition', label: 'Telomere Attrition' },
  { id: 'epigenetic_alterations', label: 'Epigenetic Alterations' },
  { id: 'loss_of_proteostasis', label: 'Loss of Proteostasis' },
  { id: 'mitochondrial_dysfunction', label: 'Mitochondrial Dysfunction' },
  { id: 'cellular_senescence', label: 'Cellular Senescence' },
  { id: 'stem_cell_exhaustion', label: 'Stem Cell Exhaustion' },
  { id: 'altered_intercellular_communication', label: 'Altered Intercellular Communication' },
  { id: 'disabled_macroautophagy', label: 'Disabled Macroautophagy' },
  { id: 'chronic_inflammation', label: 'Chronic Inflammation' },
  { id: 'dysbiosis', label: 'Dysbiosis' },
];

export default function QueryInterface({ onQuery, isLoading = false }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [proteinFilter, setProteinFilter] = useState<string>('');
  const [theoryFilters, setTheoryFilters] = useState<string[]>([]);
  const [topK, setTopK] = useState(10);
  const [proteins, setProteins] = useState<Array<{ symbol: string; name: string }>>([]);
  const [loadingProteins, setLoadingProteins] = useState(true);

  useEffect(() => {
    const fetchProteins = async () => {
      try {
        const response = await fetch(`${API_URL}/proteins/genage`);
        const data = await response.json();
        setProteins(data.proteins || []);
      } catch (error) {
        console.error('Failed to fetch proteins:', error);
      } finally {
        setLoadingProteins(false);
      }
    };
    fetchProteins();
  }, []);

  const handleTheoryToggle = (theoryId: string) => {
    setTheoryFilters(prev =>
      prev.includes(theoryId)
        ? prev.filter(id => id !== theoryId)
        : [...prev, theoryId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onQuery({
      query: query.trim(),
      proteinFilter: proteinFilter || undefined,
      theoryFilters: theoryFilters.length > 0 ? theoryFilters : undefined,
      topK,
    });
  };

  const handleClearFilters = () => {
    setProteinFilter('');
    setTheoryFilters([]);
    setTopK(10);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Query Input */}
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-white mb-2">
            Ask a question about aging proteins
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., What is the role of APOE in aging? How does SIRT6 affect longevity?"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Filters Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Protein Filter */}
          <div>
            <label htmlFor="protein" className="block text-sm font-medium text-white mb-2">
              Filter by protein (optional)
            </label>
            <select
              id="protein"
              value={proteinFilter}
              onChange={(e) => setProteinFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
              disabled={isLoading || loadingProteins}
            >
              <option value="" className="bg-[#0d1525]">All proteins</option>
              {proteins.map((protein) => (
                <option key={protein.symbol} value={protein.symbol} className="bg-[#0d1525]">
                  {protein.symbol} - {protein.name}
                </option>
              ))}
            </select>
          </div>

          {/* Top-K Slider */}
          <div>
            <label htmlFor="topK" className="block text-sm font-medium text-white mb-2">
              Number of results: {topK}
            </label>
            <input
              id="topK"
              type="range"
              min="5"
              max="50"
              step="5"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5</span>
              <span>50</span>
            </div>
          </div>
        </div>

        {/* Theory Filters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-white">
              Filter by aging theories (optional)
            </label>
            {theoryFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setTheoryFilters([])}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                disabled={isLoading}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {AGING_THEORIES.map((theory) => (
              <label
                key={theory.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${
                  theoryFilters.includes(theory.id)
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-blue-500/50 hover:bg-blue-500/5'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={theoryFilters.includes(theory.id)}
                  onChange={() => handleTheoryToggle(theory.id)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <span className="text-xs leading-tight">{theory.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Filters
          </button>
        </div>

        {/* Active Filters Summary */}
        {(proteinFilter || theoryFilters.length > 0) && (
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm">
            <p className="font-medium text-blue-400 mb-2">Active filters:</p>
            <div className="flex flex-wrap gap-2">
              {proteinFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                  Protein: {proteinFilter}
                  <button
                    type="button"
                    onClick={() => setProteinFilter('')}
                    className="hover:text-white ml-1"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              )}
              {theoryFilters.map((theoryId) => {
                const theory = AGING_THEORIES.find(t => t.id === theoryId);
                return theory ? (
                  <span
                    key={theoryId}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300"
                  >
                    {theory.label}
                    <button
                      type="button"
                      onClick={() => handleTheoryToggle(theoryId)}
                      className="hover:text-white ml-1"
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
