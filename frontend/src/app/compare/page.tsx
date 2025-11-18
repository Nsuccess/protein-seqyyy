'use client';

import ProteinComparison from '@/components/ProteinComparison';
import Link from 'next/link';

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.45em] text-[var(--accent-primary)]">
                Protein Comparison
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Compare Aging Proteins
              </h1>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                Analyze similarities and differences between multiple proteins
              </p>
            </div>
            <Link
              href="/"
              className="rounded-xl border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background)]"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ProteinComparison />
      </main>
    </div>
  );
}
