'use client';

import { useState, useEffect } from 'react';

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

  // Fetch proteins on mount
  useEffect(() => {
    const fetchProteins = async () => {
      try {
        const response = await fetch('http://localhost:8000/proteins/genage');
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
    <div className="rounded-3xl border border-[var(--border-color)] bg-white p-8 shadow-[var(--shadow-soft)]">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Query Input */}
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Ask a question about aging proteins
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., What is the role of APOE in aging? How does SIRT6 affect longevity?"
            className="w-full rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Filters Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Protein Filter */}
          <div>
            <label htmlFor="protein" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Filter by protein (optional)
            </label>
            <select
              id="protein"
              value={proteinFilter}
              onChange={(e) => setProteinFilter(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors"
              disabled={isLoading || loadingProteins}
            >
              <option value="">All proteins</option>
              {proteins.map((protein) => (
                <option key={protein.symbol} value={protein.symbol}>
                  {protein.symbol} - {protein.name}
                </option>
              ))}
            </select>
            {loadingProteins && (
              <p className="mt-1 text-xs text-[var(--foreground-subtle)]">Loading proteins...</p>
            )}
          </div>

          {/* Top-K Slider */}
          <div>
            <label htmlFor="topK" className="block text-sm font-medium text-[var(--foreground)] mb-2">
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
              className="w-full h-2 bg-[var(--accent-soft)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-[var(--foreground-subtle)] mt-1">
              <span>5</span>
              <span>50</span>
            </div>
          </div>
        </div>

        {/* Theory Filters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Filter by aging theories (optional)
            </label>
            {theoryFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setTheoryFilters([])}
                className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
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
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-color)] bg-white text-[var(--foreground-muted)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)]'
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
            className="flex-1 rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="rounded-xl border border-[var(--border-color)] bg-white px-6 py-3 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Filters
          </button>
        </div>

        {/* Active Filters Summary */}
        {(proteinFilter || theoryFilters.length > 0) && (
          <div className="rounded-lg bg-[var(--accent-soft)] px-4 py-3 text-sm">
            <p className="font-medium text-[var(--accent-primary)] mb-1">Active filters:</p>
            <div className="flex flex-wrap gap-2">
              {proteinFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
                  Protein: {proteinFilter}
                  <button
                    type="button"
                    onClick={() => setProteinFilter('')}
                    className="hover:text-[var(--accent-primary-hover)]"
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
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--accent-primary)]"
                  >
                    {theory.label}
                    <button
                      type="button"
                      onClick={() => handleTheoryToggle(theoryId)}
                      className="hover:text-[var(--accent-primary-hover)]"
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
