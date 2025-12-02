'use client';

import { useState, useEffect } from 'react';

interface ProteinViewerProps {
  pdbId: string;
  description?: string;
  height?: string;
  showControls?: boolean;
}

export default function ProteinViewer({ 
  pdbId, 
  description,
  height = '450px',
  showControls = true
}: ProteinViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<'cartoon' | 'surface' | 'ball-stick'>('cartoon');

  // Get structure image from RCSB
  const getImageUrl = () => {
    // RCSB provides structure images in this format
    return `https://cdn.rcsb.org/images/structures/${pdbId.toLowerCase().substring(1, 3)}/${pdbId.toLowerCase()}/${pdbId.toLowerCase()}_assembly-1.jpeg`;
  };

  const getViewerUrl = () => {
    return `https://www.rcsb.org/3d-view/${pdbId}`;
  };

  // Reset loading state when view mode changes
  useEffect(() => {
    setIsLoading(true);
    setError(false);
  }, [viewMode]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-sm">🧬</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">3D Structure</p>
            <p className="text-xs text-slate-500">PDB: {pdbId}</p>
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('cartoon')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'cartoon'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              Cartoon
            </button>
            <button
              onClick={() => setViewMode('surface')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'surface'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              Surface
            </button>
            <button
              onClick={() => setViewMode('ball-stick')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'ball-stick'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              Ball & Stick
            </button>
          </div>
        )}
      </div>

      {/* Viewer Container */}
      <div className="relative bg-slate-900" style={{ height }}>
        {/* Loading overlay */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500/20 border-t-green-500 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">🧬</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-4">Loading 3D structure...</p>
              <p className="text-slate-500 text-xs mt-1">Fetching from RCSB PDB</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center px-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-400 font-medium mb-2">Failed to load structure</p>
              <p className="text-slate-500 text-sm mb-4">The 3D viewer could not connect to RCSB</p>
              <a
                href={`https://www.rcsb.org/structure/${pdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
              >
                View on RCSB PDB
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* 3D Structure Image - click to open interactive viewer */}
        <a
          href={getViewerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full flex items-center justify-center bg-slate-900 group cursor-pointer block"
        >
          <img
            src={getImageUrl()}
            alt={`3D structure of ${pdbId}`}
            className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError(true);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 pointer-events-none">
            <div className="text-center text-white">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <p className="text-sm font-medium">Click to open interactive 3D viewer</p>
            </div>
          </div>
        </a>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {description && (
            <p className="text-xs text-slate-400">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`https://www.rcsb.org/structure/${pdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            RCSB PDB
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            href={`https://alphafold.ebi.ac.uk/search/text/${pdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
          >
            AlphaFold
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
