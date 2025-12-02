'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProteinViewer from '@/components/viewer/ProteinViewer';
import SequencePanel from '@/components/SequencePanel';
import { apiEndpoint } from '@/lib/api';

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
  structure?: { pdb_ids: string[]; pdb_count: number; };
}

export default function ProteinDetailPage() {
  const params = useParams();
  const symbol = params?.symbol as string;
  
  const [proteinInfo, setProteinInfo] = useState<ProteinInfo | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uniprotData, setUniprotData] = useState<UniProtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'papers'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      setLoading(true);
      setError(null);

      try {
        const infoRes = await fetch(apiEndpoint(`/protein/${symbol}`));
        if (!infoRes.ok) throw new Error('Protein not found');
        const info = await infoRes.json();
        setProteinInfo(info);

        const papersRes = await fetch(apiEndpoint(`/protein/${symbol}/papers?limit=20`));
        if (papersRes.ok) {
          const papersData = await papersRes.json();
          setPapers(papersData.papers || []);
        }

        try {
          const uniprotRes = await fetch(apiEndpoint(`/protein/${symbol}/uniprot`));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🧬</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">Loading protein data...</p>
        </div>
      </div>
    );
  }

  if (error || !proteinInfo) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 font-medium mb-2">{error || 'Protein not found'}</p>
          <Link href="/proteins" className="text-blue-400 hover:underline text-sm">
            ← Back to proteins
          </Link>
        </div>
      </div>
    );
  }

  const hasPdbStructure = (uniprotData?.structure?.pdb_ids?.length ?? 0) > 0;
  const hasSequence = uniprotData?.sequence && uniprotData.sequence.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🧬</span>
              </div>
              <span className="text-lg font-semibold text-white">AgingProteins.ai</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/query" className="text-sm text-slate-400 hover:text-white transition-colors">AI Search</Link>
              <Link href="/proteins" className="text-sm text-slate-400 hover:text-white transition-colors">Proteins</Link>
              <Link href="/theories" className="text-sm text-slate-400 hover:text-white transition-colors">Theories</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="border-b border-white/5 bg-gradient-to-b from-[#0d1525] to-[#0a0f1a]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/proteins" className="hover:text-white transition-colors">Proteins</Link>
            <span>/</span>
            <span className="text-white">{proteinInfo.symbol}</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-3xl">🧬</span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-blue-400 mb-1">Aging-Related Protein</p>
                  <h1 className="text-4xl font-bold text-white">{proteinInfo.symbol}</h1>
                </div>
              </div>
              <p className="text-lg text-slate-400 max-w-2xl">{proteinInfo.name}</p>
              
              {proteinInfo.categories?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {proteinInfo.categories.map(cat => (
                    <span key={cat} className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {proteinInfo.uniprot && (
                <a
                  href={`https://www.uniprot.org/uniprotkb/${proteinInfo.uniprot}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-400 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span>UniProt</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              <Link
                href={`/query?q=What%20is%20the%20role%20of%20${proteinInfo.symbol}%20in%20aging`}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-sm text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span>Ask AI</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-white/5 bg-[#0d1525]/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'structure'
                  ? 'text-green-400 border-green-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Structure & Sequence
              {hasPdbStructure && (
                <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">3D</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'papers'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Papers
              <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">{papers.length}</span>
            </button>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Why Aging-Related */}
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🔬</span>
                Why Aging-Related
              </h2>
              <p className="text-slate-400 leading-relaxed text-lg">{proteinInfo.why}</p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
                <p className="text-sm text-slate-500 mb-2">Associated Papers</p>
                <p className="text-3xl font-bold text-blue-400">{papers.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
                <p className="text-sm text-slate-500 mb-2">Sequence Length</p>
                <p className="text-3xl font-bold text-green-400">
                  {uniprotData?.sequence_length || uniprotData?.sequence?.length || '—'} aa
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
                <p className="text-sm text-slate-500 mb-2">PDB Structures</p>
                <p className="text-3xl font-bold text-purple-400">
                  {uniprotData?.structure?.pdb_count || 0}
                </p>
              </div>
            </div>

            {/* Preview Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 3D Structure Preview */}
              {hasPdbStructure && (
                <div 
                  className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 cursor-pointer hover:border-green-500/40 transition-colors"
                  onClick={() => setActiveTab('structure')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>🧬</span> 3D Structure Available
                    </h3>
                    <span className="text-green-400 text-sm">View →</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Interactive molecular visualization from PDB: {uniprotData?.structure?.pdb_ids?.[0]}
                  </p>
                </div>
              )}

              {/* Papers Preview */}
              {papers.length > 0 && (
                <div 
                  className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 cursor-pointer hover:border-purple-500/40 transition-colors"
                  onClick={() => setActiveTab('papers')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>📚</span> Research Papers
                    </h3>
                    <span className="text-purple-400 text-sm">View all →</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {papers.length} papers linking {proteinInfo.symbol} to aging research
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Structure Tab */}
        {activeTab === 'structure' && (
          <div className="space-y-8">
            {/* 3D Viewer */}
            {hasPdbStructure ? (
              <ProteinViewer 
                pdbId={uniprotData!.structure!.pdb_ids[0]} 
                description={`Crystal structure of ${proteinInfo.name}`}
                height="500px"
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧬</span>
                </div>
                <p className="text-slate-400 mb-2">No experimental structure available</p>
                <a
                  href={`https://alphafold.ebi.ac.uk/search/text/${proteinInfo.symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm"
                >
                  Check AlphaFold for predicted structure →
                </a>
              </div>
            )}

            {/* Other PDB structures */}
            {uniprotData?.structure?.pdb_ids && uniprotData.structure.pdb_ids.length > 1 && (
              <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Other Available Structures</h3>
                <div className="flex flex-wrap gap-2">
                  {uniprotData.structure.pdb_ids.slice(1).map(pdbId => (
                    <a
                      key={pdbId}
                      href={`https://www.rcsb.org/structure/${pdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:bg-white/10 transition-colors"
                    >
                      {pdbId}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sequence Panel */}
            {hasSequence && (
              <SequencePanel
                sequence={uniprotData!.sequence!}
                proteinName={proteinInfo.name}
                uniprotId={proteinInfo.uniprot}
                length={uniprotData?.sequence_length}
              />
            )}
          </div>
        )}

        {/* Papers Tab */}
        {activeTab === 'papers' && (
          <div className="space-y-4">
            {papers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-12 text-center">
                <p className="text-slate-400">No papers found for this protein</p>
              </div>
            ) : (
              papers.map(paper => (
                <div key={paper.pmcid} className="rounded-2xl border border-white/10 bg-[#0d1525] p-6 hover:border-purple-500/30 transition-colors">
                  <h3 className="font-medium text-white leading-snug mb-3">{paper.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {paper.year}
                    </span>
                    {paper.pmid && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        PMID: {paper.pmid}
                      </a>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Score: {(paper.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  {paper.theories?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {paper.theories.map(theory => (
                        <span key={theory} className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                          {theory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-slate-500">AgingProteins.ai — AI-Powered Aging Research Platform</p>
        </div>
      </footer>
    </div>
  );
}
