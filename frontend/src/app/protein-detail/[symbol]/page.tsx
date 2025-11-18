'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProteinViewer from '@/components/viewer/ProteinViewer';
import StructureModal from '@/components/StructureModal';

interface ProteinInfo {
  symbol: string;
  name: string;
  uniprot: string;
  why: string;
  categories: string[];
}

interface Paper {
  pmcid: string;
  pmid?: string;
  title: string;
  year: number;
  relevance_score: number;
  theories: string[];
}

interface UniProtData {
  sequence?: string;
  sequence_length?: number;
  pdb_ids?: string[];
}

export default function ProteinDetailPage() {
  const params = useParams();
  const symbol = params?.symbol as string;
  
  const [proteinInfo, setProteinInfo] = useState<ProteinInfo | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uniprotData, setUniprotData] = useState<UniProtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [selectedPdbId, setSelectedPdbId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      setLoading(true);
      setError(null);

      try {
        // Fetch protein info
        const infoRes = await fetch(`http://localhost:8000/protein/${symbol}`);
        if (!infoRes.ok) throw new Error('Protein not found');
        const info = await infoRes.json();
        setProteinInfo(info);

        // Fetch papers
        const papersRes = await fetch(`http://localhost:8000/protein/${symbol}/papers?limit=50`);
        if (papersRes.ok) {
          const papersData = await papersRes.json();
          setPapers(papersData.papers || []);
        }

        // Fetch UniProt data
        try {
          const uniprotRes = await fetch(`http://localhost:8000/protein/${symbol}/uniprot`);
          if (uniprotRes.ok) {
            const uniprotInfo = await uniprotRes.json();
            setUniprotData(uniprotInfo);
          }
        } catch (err) {
          console.warn('UniProt data not available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load protein data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const formatTheoryName = (theory: string) => {
    return theory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTheories = () => {
    const theories = new Set<string>();
    papers.forEach(paper => {
      paper.theories.forEach(theory => theories.add(theory));
    });
    return Array.from(theories).sort();
  };

  const getFilteredPapers = () => {
    if (activeTab === 'all') return papers;
    return papers.filter(paper => paper.theories.includes(activeTab));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-primary)] border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">Loading protein data...</p>
        </div>
      </div>
    );
  }

  if (error || !proteinInfo) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Protein not found'}</p>
          <Link href="/proteins" className="mt-4 inline-block text-[var(--accent-primary)] hover:underline">
            ← Back to proteins
          </Link>
        </div>
      </div>
    );
  }

  const theories = getTheories();
  const filteredPapers = getFilteredPapers();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/proteins"
              className="text-sm text-[var(--foreground-subtle)] hover:text-[var(--accent-primary)] transition-colors"
            >
              ← Back to proteins
            </Link>
            <div className="flex gap-2">
              {proteinInfo.uniprot && (
                <a
                  href={`https://www.uniprot.org/uniprotkb/${proteinInfo.uniprot}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent-primary)] transition-colors"
                >
                  UniProt →
                </a>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.45em] text-[var(--accent-primary)]">
              Aging Protein
            </p>
            <h1 className="mt-2 text-4xl font-bold text-[var(--foreground)]">
              {proteinInfo.symbol}
            </h1>
            <p className="mt-2 text-lg text-[var(--foreground-muted)]">
              {proteinInfo.name}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Overview Card */}
        <div className="rounded-3xl border border-[var(--border-color)] bg-white p-8 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Why Aging-Related
          </h2>
          <p className="text-[var(--foreground-muted)] leading-relaxed">
            {proteinInfo.why}
          </p>
          {proteinInfo.categories && proteinInfo.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {proteinInfo.categories.map(cat => (
                <span
                  key={cat}
                  className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-primary)]"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3D Structure Card */}
        {uniprotData?.pdb_ids && uniprotData.pdb_ids.length > 0 && (
          <div className="rounded-3xl border-2 border-green-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧬</span>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">
                    3D Structure
                  </h2>
                  <p className="text-sm text-[var(--foreground-subtle)] mt-1">
                    Interactive molecular visualization
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {uniprotData.pdb_ids.slice(0, 3).map(pdbId => (
                  <button
                    key={pdbId}
                    onClick={() => {
                      setSelectedPdbId(pdbId);
                      setShowStructureModal(true);
                    }}
                    className="rounded-lg border-2 border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 hover:scale-105 transition-all shadow-sm"
                  >
                    View {pdbId} in Fullscreen
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-[var(--border-color)]">
              <ProteinViewer pdbId={uniprotData.pdb_ids[0]} />
            </div>
          </div>
        )}

        {/* Sequence Card */}
        {uniprotData?.sequence && (
          <div className="rounded-3xl border border-[var(--border-color)] bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  Amino Acid Sequence
                </h2>
                <p className="text-sm text-[var(--foreground-subtle)] mt-1">
                  {uniprotData.sequence_length} amino acids
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-[var(--background)] p-4 font-mono text-xs leading-relaxed overflow-x-auto">
              {uniprotData.sequence.match(/.{1,60}/g)?.join('\n')}
            </div>
          </div>
        )}

        {/* Papers Section with Theory Tabs */}
        <div className="rounded-3xl border border-[var(--border-color)] bg-white p-8 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
            Associated Papers ({papers.length})
          </h2>

          {/* Theory Tabs */}
          {theories.length > 0 && (
            <div className="mb-6 border-b border-[var(--border-color)]">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  All Papers ({papers.length})
                </button>
                {theories.map(theory => {
                  const count = papers.filter(p => p.theories.includes(theory)).length;
                  return (
                    <button
                      key={theory}
                      onClick={() => setActiveTab(theory)}
                      className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === theory
                          ? 'border-b-2 border-purple-600 text-purple-600'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {formatTheoryName(theory)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Papers List */}
          <div className="space-y-3">
            {filteredPapers.length === 0 ? (
              <p className="text-center text-[var(--foreground-subtle)] py-8">
                No papers found for this filter
              </p>
            ) : (
              filteredPapers.map(paper => (
                <div
                  key={paper.pmcid}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4 hover:border-[var(--accent-primary)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--foreground)] leading-snug">
                        {paper.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-subtle)]">
                        <span>{paper.year}</span>
                        {paper.pmid && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://europepmc.org/article/MED/${paper.pmid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--accent-primary)] hover:underline"
                            >
                              PMID: {paper.pmid}
                            </a>
                          </>
                        )}
                        <span>•</span>
                        <span>Score: {(paper.relevance_score * 100).toFixed(1)}%</span>
                      </div>
                      {paper.theories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {paper.theories.map(theory => (
                            <span
                              key={theory}
                              className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                            >
                              {formatTheoryName(theory)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Structure Modal */}
      {selectedPdbId && (
        <StructureModal
          isOpen={showStructureModal}
          onClose={() => setShowStructureModal(false)}
          proteinSymbol={proteinInfo.symbol}
          pdbId={selectedPdbId}
        />
      )}
    </div>
  );
}
