import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border-color)] bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.45em] text-[var(--accent-primary)]">
              Aging Protein RAG System
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Ask ANY question about proteins
            </h1>
            <p className="mt-3 max-w-xl text-base text-[var(--foreground-muted)]">
              Search across 308 aging-related proteins and 7,018 scientific papers. 
              Our AI automatically identifies aging connections in your queries.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/query"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Start Searching
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/proteins"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-[var(--accent-primary)] transition-all hover:bg-[var(--accent-primary)] hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Browse Proteins
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[var(--border-color)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        {/* Stats Section */}
        <section className="grid gap-6 sm:grid-cols-3 mb-12">
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-md">
            <p className="text-sm font-medium text-blue-600 mb-2">Dataset</p>
            <p className="text-4xl font-bold text-[var(--foreground)] mb-1">308</p>
            <p className="text-sm text-[var(--foreground-muted)]">Aging-related proteins</p>
          </div>
          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-md">
            <p className="text-sm font-medium text-purple-600 mb-2">Evidence</p>
            <p className="text-4xl font-bold text-[var(--foreground)] mb-1">7,018</p>
            <p className="text-sm text-[var(--foreground-muted)]">Scientific papers indexed</p>
          </div>
          <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-md">
            <p className="text-sm font-medium text-green-600 mb-2">Focus</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mb-1">Universal RAG</p>
            <p className="text-sm text-[var(--foreground-muted)]">Ask any protein question</p>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">✨ New Features</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🤖</span>
                <h3 className="text-lg font-semibold">Universal Queries</h3>
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Ask ANY question about proteins - not just aging-specific. Our AI automatically identifies aging connections.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🧬</span>
                <h3 className="text-lg font-semibold">3D Structures</h3>
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Interactive 3D protein visualization with Molstar. View structures inline or in fullscreen mode.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📚</span>
                <h3 className="text-lg font-semibold">Enhanced Citations</h3>
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Bold, prominent source citations with hover effects. Citations are now impossible to miss!
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🎯</span>
                <h3 className="text-lg font-semibold">Aging Relevance</h3>
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Automatic aging relevance analysis with visual badges showing connections to 11 aging theories.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">🚀 Quick Start</h2>
          <div className="grid gap-4">
            <Link href="/query" className="rounded-xl border-2 border-[var(--accent-primary)] bg-gradient-to-r from-blue-50 to-purple-50 p-6 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Try a Query</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">Ask "What is the function of p53?" or any protein question</p>
                </div>
                <svg className="h-6 w-6 text-[var(--accent-primary)] group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link href="/proteins" className="rounded-xl border border-[var(--border-color)] bg-white p-6 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Browse Proteins</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">Explore all 308 aging-related proteins with 3D structures</p>
                </div>
                <svg className="h-6 w-6 text-[var(--foreground-muted)] group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link href="/stats" className="rounded-xl border border-[var(--border-color)] bg-white p-6 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">View Statistics</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">Explore dataset coverage and aging theory distribution</p>
                </div>
                <svg className="h-6 w-6 text-[var(--foreground-muted)] group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-color)] bg-white/50 mt-12">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center">
          <p className="text-sm text-[var(--foreground-subtle)]">
            Aging Protein RAG System • 308 Proteins • 7,018 Papers • Universal Search
          </p>
        </div>
      </footer>
    </div>
  );
}
