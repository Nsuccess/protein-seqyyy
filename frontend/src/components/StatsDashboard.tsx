'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MolInstructionsStats from './MolInstructionsStats';
import { apiEndpoint } from '@/lib/api';

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
        const response = await fetch(apiEndpoint('/stats/comprehensive'));
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
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">
            Loading statistics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
        <p className="text-sm text-red-400">
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
        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Protein Coverage</p>
              <p className="text-2xl font-bold text-white">
                {stats.coverage.coverage_percentage}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {stats.coverage.proteins_with_papers} of {stats.coverage.total_genage_proteins} proteins
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Papers</p>
              <p className="text-2xl font-bold text-white">
                {stats.quality.total_papers.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Indexed in corpus
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-2">
              <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Theories</p>
              <p className="text-2xl font-bold text-white">
                {stats.theories.theories_identified}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Aging hallmarks identified
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2">
              <svg className="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Recent Papers</p>
              <p className="text-2xl font-bold text-white">
                {stats.quality.recent_papers.percentage}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Published in last 5 years
          </p>
        </div>
      </div>


      {/* Coverage Pie Chart */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-4 sm:p-6 md:p-8">
        <h2 className="mb-4 md:mb-6 text-lg sm:text-xl font-semibold text-white">
          Protein Coverage Distribution
        </h2>
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          {/* Pie Chart Visualization */}
          <div className="flex items-center justify-center py-4">
            <div className="relative h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="20"
                  strokeDasharray={`${stats.coverage.coverage_percentage * 2.51} 251`}
                  className="transition-all duration-500"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="20"
                  strokeDasharray={`${(100 - stats.coverage.coverage_percentage) * 2.51} 251`}
                  strokeDashoffset={`-${stats.coverage.coverage_percentage * 2.51}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {stats.coverage.coverage_percentage}%
                </p>
                <p className="text-xs text-slate-500">Coverage</p>
              </div>
            </div>
          </div>

          {/* Legend and Details */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-white">With Papers</span>
              </div>
              <span className="text-lg font-bold text-white">
                {stats.coverage.proteins_with_papers}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-slate-600" />
                <span className="text-sm font-medium text-white">Without Papers</span>
              </div>
              <span className="text-lg font-bold text-white">
                {stats.coverage.proteins_without_papers}
              </span>
            </div>
            <div className="mt-4 rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
              <p className="text-xs font-semibold text-blue-400">Distribution Summary</p>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
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
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-4 sm:p-6 md:p-8">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Aging Theory Distribution
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
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
                  <span className="font-medium text-white truncate pr-2">
                    {formatTheoryName(theory.theory)}
                  </span>
                  <span className="text-slate-500 whitespace-nowrap text-xs">
                    {theory.paper_count} ({theory.percentage}%)
                  </span>
                </div>
                <button
                  onClick={() => handleTheoryClick(theory.theory)}
                  className="h-6 sm:h-8 w-full overflow-hidden rounded-lg bg-white/5 cursor-pointer transition-all hover:shadow-md"
                  aria-label={`Search papers about ${formatTheoryName(theory.theory)}`}
                >
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 group-hover:from-purple-400 group-hover:to-purple-500"
                    style={{ width: `${widthPercentage}%` }}
                  />
                </button>
                
                {isHovered && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-10 rounded-lg border border-purple-500/30 bg-[#0d1525] p-3 shadow-lg">
                    <p className="text-xs font-semibold text-purple-300">
                      {formatTheoryName(theory.theory)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {theory.paper_count} papers ({theory.percentage}% of corpus)
                    </p>
                    <p className="mt-2 text-xs text-purple-400">
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
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-4 sm:p-6 md:p-8">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Top Proteins by Paper Count
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
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
                className="group relative rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 transition-all hover:border-blue-500/50 hover:bg-blue-500/10 cursor-pointer text-left"
                aria-label={`Search papers about ${protein.protein}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500">#{index + 1}</p>
                    <p className="mt-1 text-base sm:text-lg font-bold text-blue-400">
                      {protein.protein}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-400">
                    {protein.paper_count}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">papers</p>
                
                {isHovered && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-10 rounded-lg border border-blue-500/30 bg-[#0d1525] p-3 shadow-lg">
                    <p className="text-xs font-semibold text-blue-300">
                      {protein.protein}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {protein.paper_count} papers in corpus
                    </p>
                    <p className="mt-2 text-xs text-blue-400">
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
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-4 sm:p-6 md:p-8">
        <h2 className="mb-4 md:mb-6 text-lg sm:text-xl font-semibold text-white">
          Publication Year Distribution
        </h2>
        <div className="mb-4 md:mb-6 grid gap-3 sm:gap-4 grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-xs text-slate-500">Earliest</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white">
              {stats.quality.year_range.earliest}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-xs text-slate-500">Median</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white">
              {stats.quality.year_range.median}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-xs text-slate-500">Latest</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white">
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
                  <span className="font-medium text-white">{decade.decade}</span>
                  <span className="text-slate-500 text-xs">{decade.count} papers</span>
                </div>
                <div className="h-5 sm:h-6 w-full overflow-hidden rounded-lg bg-white/5 cursor-pointer transition-all hover:shadow-md">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 group-hover:from-green-400 group-hover:to-green-500"
                    style={{ width: `${widthPercentage}%` }}
                  />
                </div>
                
                {isHovered && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-10 rounded-lg border border-green-500/30 bg-[#0d1525] p-3 shadow-lg">
                    <p className="text-xs font-semibold text-green-300">{decade.decade}</p>
                    <p className="mt-1 text-xs text-slate-400">
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
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-4 sm:p-6 md:p-8">
        <h2 className="mb-4 md:mb-6 text-lg sm:text-xl font-semibold text-white">
          Data Completeness
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-white">PMCID</span>
              <span className="text-sm font-bold text-blue-400">
                {stats.quality.completeness.pmcid.percentage}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${stats.quality.completeness.pmcid.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {stats.quality.completeness.pmcid.count.toLocaleString()} papers
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-white">DOI</span>
              <span className="text-sm font-bold text-purple-400">
                {stats.quality.completeness.doi.percentage}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{ width: `${stats.quality.completeness.doi.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {stats.quality.completeness.doi.count.toLocaleString()} papers
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-white">Title</span>
              <span className="text-sm font-bold text-green-400">
                {stats.quality.completeness.title.percentage}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${stats.quality.completeness.title.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {stats.quality.completeness.title.count.toLocaleString()} papers
            </p>
          </div>
        </div>
      </div>

      {/* Mol-Instructions Stats */}
      <MolInstructionsStats />

      {/* Footer */}
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-slate-500">
        Statistics generated at {new Date(stats.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
