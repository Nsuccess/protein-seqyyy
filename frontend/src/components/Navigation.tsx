'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="border-b border-white/5 bg-[#0a0f1a]">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl">🧬</span>
            </div>
            <span className="text-lg font-semibold text-white">AgingProteins.ai</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/proteins"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/proteins'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Proteins
            </Link>
            <Link
              href="/theories"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/theories'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Theories
            </Link>
            <Link
              href="/query"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/query'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              AI Search
            </Link>
            <Link
              href="/stats"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/stats'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Stats
            </Link>
            <Link
              href="/compare"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/compare'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Compare
            </Link>
            <Link
              href="/"
              className="ml-4 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
