'use client';

import { useState } from 'react';

interface SequenceObject {
  value?: string;
  sequence?: string;
}

interface SequencePanelProps {
  sequence?: string | SequenceObject | undefined;
  proteinName?: string;
  uniprotId?: string;
  length?: number;
  // Alternative props used in protein/[id]/page.tsx
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string | null;
}

export default function SequencePanel({ 
  sequence, 
  uniprotId,
  length,
  title,
  subtitle,
  isLoading,
  error
}: SequencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mx-auto mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="text-slate-400 mt-4">Loading sequence...</p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Handle different sequence formats - could be string or object
  const sequenceStr: string = typeof sequence === 'string' 
    ? sequence 
    : (sequence?.value || sequence?.sequence || '');

  // Early return if no valid sequence
  if (!sequenceStr || sequenceStr.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8 text-center">
        <p className="text-slate-400">No sequence data available</p>
      </div>
    );
  }

  const sequenceLength = length || sequenceStr.length;
  const displaySequence = isExpanded ? sequenceStr : sequenceStr.slice(0, 300);
  
  // Use title/subtitle if provided, otherwise use defaults
  const displayTitle = title || 'Amino Acid Sequence';
  const displaySubtitle = subtitle || `${sequenceLength} residues${uniprotId ? ` • UniProt: ${uniprotId}` : ''}`;

  // Color amino acids by property
  const colorizeSequence = (seq: string) => {
    return seq.split('').map((aa, i) => {
      let colorClass = 'text-slate-400';
      
      // Hydrophobic (green)
      if ('AILMFWV'.includes(aa)) colorClass = 'text-green-400';
      // Polar (blue)
      else if ('STNQ'.includes(aa)) colorClass = 'text-blue-400';
      // Charged positive (red)
      else if ('RKH'.includes(aa)) colorClass = 'text-red-400';
      // Charged negative (purple)
      else if ('DE'.includes(aa)) colorClass = 'text-purple-400';
      // Special (yellow)
      else if ('CGPY'.includes(aa)) colorClass = 'text-yellow-400';

      return (
        <span key={i} className={colorClass}>
          {aa}
        </span>
      );
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sequenceStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate amino acid composition
  const getComposition = () => {
    const counts: Record<string, number> = {};
    for (const aa of sequenceStr) {
      counts[aa] = (counts[aa] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const topAA = getComposition();

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <span className="text-sm">🧬</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{displayTitle}</p>
            <p className="text-xs text-slate-500">{displaySubtitle}</p>
          </div>
        </div>
        
        <button
          onClick={copyToClipboard}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Composition Bar */}
      <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <p className="text-xs text-slate-500 mb-2">Top amino acids:</p>
        <div className="flex items-center gap-2">
          {topAA.map(([aa, count]) => (
            <div
              key={aa}
              className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-mono"
              title={`${aa}: ${count} (${((count / sequenceLength) * 100).toFixed(1)}%)`}
            >
              {aa}: {((count / sequenceLength) * 100).toFixed(0)}%
            </div>
          ))}
        </div>
      </div>

      {/* Sequence Display */}
      <div className="p-4">
        <div className="rounded-lg bg-slate-900/50 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
          <div className="whitespace-pre-wrap break-all">
            {colorizeSequence(displaySequence)}
            {!isExpanded && sequenceStr.length > 300 && (
              <span className="text-slate-600">...</span>
            )}
          </div>
        </div>

        {sequenceStr.length > 300 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            {isExpanded ? 'Show less' : `Show all ${sequenceLength} residues`}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
        <p className="text-xs text-slate-500 mb-2">Color legend:</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-slate-400">Hydrophobic</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-slate-400">Polar</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span className="text-slate-400">Basic (+)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span className="text-slate-400">Acidic (-)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="text-slate-400">Special</span>
          </span>
        </div>
      </div>
    </div>
  );
}
