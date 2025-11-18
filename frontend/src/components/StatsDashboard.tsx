'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MolInstructionsStats from './MolInstructionsStats';

interface CoverageStats {
  total_genage_proteins: number;
  proteins_with_papers: number;
  proteins_without_papers: number;
  coverage_percentage: number;
  top_proteins: Array<{ protein: string; paper_count: number }>;
  distribution_summary: {
    proteins_with_1_paper: number;
    proteins_with_2_5_papers: number;
    proteins_with_6_10_papers: number;
    proteins_with_11_plus_papers: number;
  };
  total_protein_mentions: number;
  papers_with_proteins: number;
}

interface TheoryStats {
  total_papers: number;
  papers_with_theories: number;
  papers_without_theories: number;
  coverage_percentage: number;
  theories_identified: number;
  theory_distribution: Array<{
    theory: string;
    paper_count: number;
    percentage: number;
  }>;
  top_5_theories: Array<{ theory: string; paper_count: number }>;
}

interface QualityStats {
  total_papers: number;
  papers_with_year: number;
  year_coverage_percentage: number;
  year_range: {
    earliest: number;
    latest: number;
    median: number;
  };
  recent_papers: {
    last_5_years: number;
    percentage: number;
  };
  year_distribution: Array<{ year: number; count: number }>;
  decade_distribution: Array<{ decade: string; count: number }>;
  completeness: {
    pmcid: { count: number; percentage: number };
    doi: { count: number; percentage: number };
    title: { count: number; percentage: number };
  };
}

interface ComprehensiveStats {
  coverage: CoverageStats;
  theories: TheoryStats;
  quality: QualityStats;
  generated_at: string;
}

export default function StatsDashboard() {
  const [stats, setStats] = useState<ComprehensiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTheory, setHoveredTheory] = useState<string | null>(null);
  const [hoveredDecade, setHoveredDecade] = useState<string | null>(null);
  const [hoveredProtein, setHoveredProtein] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/stats/comprehensive');
        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
          <span className="text-sm font-medium text-[var(--foreground-muted)]">
            Loading statistics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          {error || 'Failed to load statistics'}
        </p>
      </div>
    );
  }

  const formatTheoryName = (theory: string) => {
    return theory
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleTheoryClick = (theory: string) => {
    router.push(`/query?theory=${encodeURIComponent(theory)}`);
  };

  const handleProteinClick = (protein: string) => {
    router.push(`/query?protein=${encodeURIComponent(protein)}`);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-blue-50 to-white p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-subtle)]">Protein Coverage</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {stats.coverage.coverage_percentage}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--foreground-muted)]">
            {stats.coverage.proteins_with_papers} of {stats.coverage.total_genage_proteins} proteins
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-purple-50 to-white p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-subtle)]">Total Papers</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {stats.quality.total_papers.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--foreground-muted)]">
            Indexed in corpus
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-green-50 to-white p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-subtle)]">Theories</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {stats.theories.theories_identified}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--foreground-muted)]">
            Aging hallmarks identified
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-orange-50 to-white p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-subtle)]">Recent Papers</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {stats.quality.recent_papers.percentage}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--foreground-muted)]">
            Published in last 5 years
          </p>
        </div>
      </div>

      {/* Coverage Pie Chart */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-4 sm:p-6 md:p-8 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 md:mb-6 text-lg sm:text-xl font-semibold text-[var(--foreground)]">
          Protein Coverage Distribution
        </h2>
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          {/* Pie Chart Visualization */}
          <div className="flex items-center justify-center py-4">
            <div className="relative h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                {/* Proteins with papers */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="20"
                  strokeDasharray={`${stats.coverage.coverage_percentage * 2.51} 251`}
                  className="transition-all duration-500"
                />
                {/* Proteins without papers */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                  strokeDasharray={`${(100 - stats.coverage.coverage_percentage) * 2.51} 251`}
                  strokeDashoffset={`-${stats.coverage.coverage_percentage * 2.51}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                  {stats.coverage.coverage_percentage}%
                </p>
                <p className="text-xs text-[var(--foreground-subtle)]">Coverage</p>
              </div>
            </div>
          </div>

          {/* Legend and Details */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-[var(--accent-primary)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  With Papers
                </span>
              </div>
              <span className="text-lg font-bold text-[var(--foreground)]">
                {stats.coverage.proteins_with_papers}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-gray-300" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Without Papers
                </span>
              </div>
              <span className="text-lg font-bold text-[var(--foreground)]">
                {stats.coverage.proteins_without_papers}
              </span>
            </div>
            <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-4">
              <p className="text-xs font-semibold text-[var(--accent-primary)]">
                Distribution Summary
              </p>
              <div className="mt-2 space-y-1 text-xs text-[var(--foreground-muted)]">
                <p>• {stats.coverage.distribution_summary.proteins_with_1_paper} proteins with 1 paper</p>
                <p>• {stats.coverage.distribution_summary.proteins_with_2_5_papers} proteins with 2-5 papers</p>
                <p>• {stats.coverage.distribution_summary.proteins_with_6_10_papers} proteins with 6-10 papers</p>
                <p>• {stats.coverage.distribution_summary.proteins_with_11_plus_papers} proteins with 11+ papers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theory Distribution Bar Chart */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-4 sm:p-6 md:p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
            Aging Theory Distribution
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--foreground-subtle)]">
            Click on a theory to search related papers
          </p>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {stats.theories.theory_distribution.slice(0, 11).map((theory, index) => {
            const maxCount = stats.theories.theory_distribution[0].paper_count;
            const widthPercentage = (theory.paper_count / maxCount) * 100;
            const isHovered = hoveredTheory === theory.theory;
            
            return (
              <div 
                key={theory.theory} 
                className="group relative"
                onMouseEnter={() => setHoveredTheory(theory.theory)}
                onMouseLeave={() => setHoveredTheory(null)}
              >
                <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-[var(--foreground)] truncate pr-2">
                    {formatTheoryName(theory.theory)}
                  </span>
                  <span className="text-[var(--foreground-subtle)] whitespace-nowrap text-xs">
                    {theory.paper_count} ({theory.percentage}%)
                  </span>
                </div>
                <button
                  onClick={() => handleTheoryClick(theory.theory)}
                  className="h-6 sm:h-8 w-full overflow-hidden rounded-lg bg-gray-100 cursor-pointer transition-all hover:shadow-md"
                  aria-label={`Search papers about ${formatTheoryName(theory.theory)}`}
                >
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 group-hover:from-purple-600 group-hover:to-purple-700"
                    style={{ width: `${widthPercentage}%` }}
                  />
                </button>
                
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-10 rounded-lg border border-purple-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-purple-900">
                      {formatTheoryName(theory.theory)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                      {theory.paper_count} papers ({theory.percentage}% of corpus)
                    </p>
                    <p className="mt-2 text-xs text-purple-600">
                      Click to search papers →
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Proteins */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-4 sm:p-6 md:p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
            Top Proteins by Paper Count
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--foreground-subtle)]">
            Click on a protein to search related papers
          </p>
        </div>
        <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.coverage.top_proteins.slice(0, 12).map((protein, index) => {
            const isHovered = hoveredProtein === protein.protein;
            
            return (
              <button
                key={protein.protein}
                onClick={() => handleProteinClick(protein.protein)}
                onMouseEnter={() => setHoveredProtein(protein.protein)}
                onMouseLeave={() => setHoveredProtein(null)}
                className="group relative rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-3 sm:p-4 transition-all hover:border-[var(--accent-primary)] hover:shadow-md cursor-pointer text-left"
                aria-label={`Search papers about ${protein.protein}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[var(--foreground-subtle)]">#{index + 1}</p>
                    <p className="mt-1 text-base sm:text-lg font-bold text-[var(--accent-primary)]">
                      {protein.protein}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-primary)]">
                    {protein.paper_count}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--foreground-muted)]">papers</p>
                
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-10 rounded-lg border border-blue-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-blue-900">
                      {protein.protein}
                    </p>
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                      {protein.paper_count} papers in corpus
                    </p>
                    <p className="mt-2 text-xs text-blue-600">
                      Click to search →
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Publication Year Histogram */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-4 sm:p-6 md:p-8 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 md:mb-6 text-lg sm:text-xl font-semibold text-[var(--foreground)]">
          Publication Year Distribution
        </h2>
        <div className="mb-4 md:mb-6 grid gap-3 sm:gap-4 grid-cols-3">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-3 sm:p-4">
            <p className="text-xs text-[var(--foreground-subtle)]">Earliest</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-[var(--foreground)]">
              {stats.quality.year_range.earliest}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-3 sm:p-4">
            <p className="text-xs text-[var(--foreground-subtle)]">Median</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-[var(--foreground)]">
              {stats.quality.year_range.median}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-3 sm:p-4">
            <p className="text-xs text-[var(--foreground-subtle)]">Latest</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-[var(--foreground)]">
              {stats.quality.year_range.latest}
            </p>
          </div>
        </div>

        {/* Decade Distribution */}
        <div className="space-y-2 sm:space-y-3">
          {stats.quality.decade_distribution.map((decade) => {
            const maxCount = Math.max(...stats.quality.decade_distribution.map(d => d.count));
            const widthPercentage = (decade.count / maxCount) * 100;
            const isHovered = hoveredDecade === decade.decade;
            const decadePercentage = ((decade.count / stats.quality.total_papers) * 100).toFixed(1);
            
            return (
              <div 
                key={decade.decade} 
                className="group relative"
                onMouseEnter={() => setHoveredDecade(decade.decade)}
                onMouseLeave={() => setHoveredDecade(null)}
              >
                <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-[var(--foreground)]">
                    {decade.decade}
                  </span>
                  <span className="text-[var(--foreground-subtle)] text-xs">
                    {decade.count} papers
                  </span>
                </div>
                <div className="h-5 sm:h-6 w-full overflow-hidden rounded-lg bg-gray-100 cursor-pointer transition-all hover:shadow-md">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 group-hover:from-green-600 group-hover:to-green-700"
                    style={{ width: `${widthPercentage}%` }}
                  />
                </div>
                
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-10 rounded-lg border border-green-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-green-900">
                      {decade.decade}
                    </p>
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                      {decade.count} papers ({decadePercentage}% of corpus)
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Completeness */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-4 sm:p-6 md:p-8 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 md:mb-6 text-lg sm:text-xl font-semibold text-[var(--foreground)]">
          Data Completeness
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">PMCID</span>
              <span className="text-sm font-bold text-[var(--accent-primary)]">
                {stats.quality.completeness.pmcid.percentage}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)]"
                style={{ width: `${stats.quality.completeness.pmcid.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
              {stats.quality.completeness.pmcid.count.toLocaleString()} papers
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">DOI</span>
              <span className="text-sm font-bold text-purple-600">
                {stats.quality.completeness.doi.percentage}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-purple-600"
                style={{ width: `${stats.quality.completeness.doi.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
              {stats.quality.completeness.doi.count.toLocaleString()} papers
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">Title</span>
              <span className="text-sm font-bold text-green-600">
                {stats.quality.completeness.title.percentage}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-600"
                style={{ width: `${stats.quality.completeness.title.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
              {stats.quality.completeness.title.count.toLocaleString()} papers
            </p>
          </div>
        </div>
      </div>

      {/* Mol-Instructions Stats */}
      <MolInstructionsStats />

      {/* Footer */}
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 text-center text-xs text-[var(--foreground-subtle)]">
        Statistics generated at {new Date(stats.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
