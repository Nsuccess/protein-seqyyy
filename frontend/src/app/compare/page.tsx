'use client';

import ProteinComparison from '@/components/ProteinComparison';
import Link from 'next/link';

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🧬</span>
              </div>
              <span className="text-lg font-semibold">AgingProteins.ai</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/proteins" className="text-sm text-slate-400 hover:text-white transition-colors">Proteins</Link>
              <Link href="/theories" className="text-sm text-slate-400 hover:text-white transition-colors">Theories</Link>
              <Link href="/query" className="text-sm text-slate-400 hover:text-white transition-colors">Search</Link>
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0d1525]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-xs font-medium uppercase tracking-widest text-indigo-400 mb-2">Analysis Tool</p>
          <h1 className="text-3xl font-bold">Compare Aging Proteins</h1>
          <p className="mt-2 text-slate-400">
            Analyze similarities and differences between multiple proteins
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ProteinComparison />
      </main>
    </div>
  );
}
