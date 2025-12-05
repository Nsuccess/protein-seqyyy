'use client';

import { useState, useEffect } from 'react';
import { apiEndpoint } from '@/lib/api';

interface MolStats {
  total_instructions: number;
  by_task: Record<string, number>;
  available_tasks: string[];
  loaded: boolean;
}

export default function MolInstructionsStats() {
  const [stats, setStats] = useState<MolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(apiEndpoint('/mol-instructions/stats'));
        if (!response.ok) throw new Error('Failed to fetch Mol-Instructions stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatTaskName = (task: string) => {
    return task.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
        <p className="text-sm text-slate-400">Loading Mol-Instructions stats...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6">
        <p className="text-sm font-semibold text-orange-300 mb-2">Mol-Instructions Not Available</p>
        <p className="text-xs text-orange-400">
          {error || 'Dataset not loaded. Few-shot learning features are unavailable.'}
        </p>
      </div>
    );
  }

  if (!stats.loaded || stats.total_instructions === 0) {
    return (
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
        <p className="text-sm font-semibold text-yellow-300 mb-2">Mol-Instructions Dataset</p>
        <p className="text-xs text-yellow-400">
          Dataset not loaded. Download to enable few-shot protein function prediction.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(stats.by_task));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-2">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Mol-Instructions Dataset</h3>
            <p className="text-xs text-slate-500">Few-shot learning for protein function prediction</p>
          </div>
        </div>
      </div>

      {/* Total Count Card */}
      <div className="mb-6 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-6 text-center">
        <p className="text-sm font-semibold text-indigo-300 mb-2">Aging-Relevant Instructions</p>
        <p className="text-4xl font-bold text-white">
          {stats.total_instructions.toLocaleString()}
        </p>
        <p className="text-xs text-indigo-400 mt-2">Filtered for longevity research keywords</p>
      </div>

      {/* Task Distribution */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-white mb-3">Distribution by Task Type</p>
        {Object.entries(stats.by_task).map(([task, count]) => {
          const percentage = (count / stats.total_instructions) * 100;
          const widthPercentage = (count / maxCount) * 100;
          
          return (
            <div key={task} className="group">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-white">{formatTaskName(task)}</span>
                <span className="text-slate-500 text-xs">
                  {count.toLocaleString()} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-lg bg-white/5">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 group-hover:from-indigo-400 group-hover:to-purple-500"
                  style={{ width: `${widthPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
        <p className="text-xs font-semibold text-indigo-300 mb-1">🧬 Aging-Filtered Dataset</p>
        <p className="text-xs text-indigo-400">
          Filtered for aging keywords: telomere, senescence, DNA repair, autophagy, p53, apoptosis, mitochondria, and more.
        </p>
      </div>
    </div>
  );
}
