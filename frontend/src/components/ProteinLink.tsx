'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ProteinLinkProps {
  symbol: string;
  hasStructure?: boolean;
  onView3D?: () => void;
}

export default function ProteinLink({ symbol, hasStructure, onView3D }: ProteinLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1">
      <Link
        href={`/protein-detail/${symbol}`}
        className="font-semibold text-[var(--accent-primary)] hover:underline decoration-2 underline-offset-2 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {symbol}
      </Link>
      
      {hasStructure && onView3D && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onView3D();
          }}
          className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          title="View 3D structure"
        >
          <span className="text-xs">🧬</span>
        </button>
      )}
      
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-10 w-48 rounded-lg border border-[var(--border-color)] bg-white p-3 shadow-lg animate-in fade-in duration-200">
          <p className="text-xs font-semibold text-[var(--foreground)]">{symbol}</p>
          <p className="text-xs text-[var(--foreground-subtle)] mt-1">
            Click to view details
          </p>
          {hasStructure && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <span>✓</span>
              <span>3D structure available</span>
            </p>
          )}
        </div>
      )}
    </span>
  );
}
