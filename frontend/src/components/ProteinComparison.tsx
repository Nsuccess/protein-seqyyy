'use client';

import { useState, useEffect } from 'react';
import { apiEndpoint } from '@/lib/api';

interface ProteinData {
  symbol: string;
  name: string;
  uniprot: string;
  why: string;
  categories: string[];
  papers?: Array<{
    pmcid: string;
    pmid?: string;
    title: string;
    year: number;
    relevance_score: number;
    theories: string[];
  }>;
  sequence?: string;
  sequence_length?: number;
}

interface ProteinOption {
  symbol: string;
  name: string;
}

export default function ProteinComparison() {
  const [availableProteins, setAvailableProteins] = useState<ProteinOption[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [proteinData, setProteinData] = useState<Map<string, ProteinData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProteins, setLoadingProteins] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProteins = async () => {
      try {
        const response = await fetch(apiEndpoint('/proteins/genage'));
        const data = await response.json();
        setAvailableProteins(data.proteins || []);
      } catch (err) {
        console.error('Failed to fetch proteins:', err);
        setError('Failed to load protein list');
      } finally {
        setLoadingProteins(false);
      }
    };
    fetchProteins();
  }, []);

  const handleAddProtein = (symbol: string) => {
    if (selectedProteins.length >= 4) {
      setError('Maximum 4 proteins can be compared');
      return;
    }
    if (selectedProteins.includes(symbol)) {
      setError('Protein already selected');
      return;
    }
    setSelectedProteins([...selectedProteins, symbol]);
    fetchProteinData(symbol);
  };

  const handleRemoveProtein = (symbol: string) => {
    setSelectedProteins(selectedProteins.filter(s => s !== symbol));
    const newData = new Map(proteinData);
    newData.delete(symbol);
    setProteinData(newData);
  };

  const fetchProteinData = async (symbol: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const proteinResponse = await fetch(apiEndpoint(`/protein/${symbol}`));
      if (!proteinResponse.ok) throw new Error('Failed to fetch protein data');
      const proteinInfo = await proteinResponse.json();

      const papersResponse = await fetch(apiEndpoint(`/protein/${symbol}/papers?limit=20`));
      const papersData = await papersResponse.json();

      let sequence = '';
      let sequence_length = 0;
      try {
        const uniprotResponse = await fetch(apiEndpoint(`/protein/${symbol}/uniprot`));
        if (uniprotResponse.ok) {
          const uniprotData = await uniprotResponse.json();
          sequence = uniprotData.sequence || '';
          sequence_length = uniprotData.sequence_length || 0;
        }
      } catch (err) {
        console.warn('UniProt data not available for', symbol);
      }

      const newData = new Map(proteinData);
      newData.set(symbol, {
        symbol: proteinInfo.symbol,
        name: proteinInfo.name,
        uniprot: proteinInfo.uniprot,
        why: proteinInfo.why,
        categories: proteinInfo.categories || [],
        papers: papersData.papers || [],
        sequence,
        sequence_length
      });
      setProteinData(newData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch protein data');
      console.error('Error fetching protein data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSharedPapers = () => {
    if (selectedProteins.length < 2) return [];
    const paperSets = selectedProteins.map(symbol => {
      const data = proteinData.get(symbol);
      return new Set(data?.papers?.map(p => p.pmcid) || []);
    });
    const shared = Array.from(paperSets[0]).filter(pmcid =>
      paperSets.every(set => set.has(pmcid))
    );
    return shared;
  };

  const getSharedTheories = () => {
    if (selectedProteins.length < 2) return [];
    const theorySets = selectedProteins.map(symbol => {
      const data = proteinData.get(symbol);
      const theories = new Set<string>();
      data?.papers?.forEach(paper => {
        paper.theories.forEach(theory => theories.add(theory));
      });
      return theories;
    });
    const shared = Array.from(theorySets[0]).filter(theory =>
      theorySets.every(set => set.has(theory))
    );
    return shared;
  };

  const formatTheoryName = (theory: string) => {
    return theory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Protein Selector */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Select Proteins to Compare (up to 4)
        </h2>
        
        <div className="flex flex-wrap gap-3">
          {selectedProteins.map(symbol => {
            const data = proteinData.get(symbol);
            return (
              <div
                key={symbol}
                className="flex items-center gap-2 rounded-lg border border-indigo-500/50 bg-indigo-500/20 px-4 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-indigo-300">{symbol}</p>
                  {data && (
                    <p className="text-xs text-slate-400">{data.name}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveProtein(symbol)}
                  className="text-indigo-300 hover:text-red-400"
                  aria-label={`Remove ${symbol}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {selectedProteins.length < 4 && (
          <div className="mt-4">
            <label htmlFor="protein-select" className="block text-sm font-medium text-white mb-2">
              Add protein
            </label>
            <select
              id="protein-select"
              onChange={(e) => {
                if (e.target.value) {
                  handleAddProtein(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
              disabled={loadingProteins || loading}
            >
              <option value="" className="bg-[#0d1525]">Select a protein...</option>
              {availableProteins
                .filter(p => !selectedProteins.includes(p.symbol))
                .map(protein => (
                  <option key={protein.symbol} value={protein.symbol} className="bg-[#0d1525]">
                    {protein.symbol} - {protein.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-sm font-medium text-slate-400">Loading protein data...</span>
          </div>
        </div>
      )}


      {/* Comparison Table */}
      {selectedProteins.length > 0 && !loading && (
        <>
          {/* Overview Comparison */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6 overflow-x-auto">
            <h2 className="mb-4 text-xl font-semibold text-white">Protein Overview</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-left font-semibold text-white">Property</th>
                  {selectedProteins.map(symbol => (
                    <th key={symbol} className="py-3 px-4 text-left font-semibold text-indigo-400">
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium text-slate-400">Full Name</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-white">{data?.name || '-'}</td>
                    );
                  })}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium text-slate-400">UniProt ID</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4">
                        {data?.uniprot ? (
                          <a
                            href={`https://www.uniprot.org/uniprotkb/${data.uniprot}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline"
                          >
                            {data.uniprot}
                          </a>
                        ) : '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium text-slate-400">Sequence Length</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-white">
                        {data?.sequence_length ? `${data.sequence_length} aa` : '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium text-slate-400">Paper Count</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-white">{data?.papers?.length || 0}</td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-400">Why Aging-Related</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-slate-400 text-xs">{data?.why || '-'}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Paper Overlap Analysis */}
          {selectedProteins.length >= 2 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Paper Overlap Analysis</h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {selectedProteins.map(symbol => {
                  const data = proteinData.get(symbol);
                  const paperCount = data?.papers?.length || 0;
                  const sharedCount = getSharedPapers().length;
                  const uniqueCount = paperCount - sharedCount;
                  
                  return (
                    <div key={symbol} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-indigo-400">{symbol}</p>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total papers:</span>
                          <span className="font-semibold text-white">{paperCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Unique:</span>
                          <span className="font-semibold text-blue-400">{uniqueCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Shared:</span>
                          <span className="font-semibold text-green-400">{sharedCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {getSharedPapers().length > 0 && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-sm font-semibold text-green-300 mb-2">
                    {getSharedPapers().length} Shared Paper{getSharedPapers().length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-green-400">These papers mention all selected proteins</p>
                </div>
              )}
            </div>
          )}

          {/* Theory Overlap */}
          {selectedProteins.length >= 2 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Aging Theory Overlap</h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {selectedProteins.map(symbol => {
                  const data = proteinData.get(symbol);
                  const theories = new Set<string>();
                  data?.papers?.forEach(paper => {
                    paper.theories.forEach(theory => theories.add(theory));
                  });
                  
                  return (
                    <div key={symbol} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-indigo-400 mb-3">{symbol}</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(theories).slice(0, 5).map(theory => (
                          <span
                            key={theory}
                            className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300"
                          >
                            {formatTheoryName(theory).split(' ').slice(0, 2).join(' ')}
                          </span>
                        ))}
                        {theories.size > 5 && (
                          <span className="text-xs text-slate-500">+{theories.size - 5}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {getSharedTheories().length > 0 && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm font-semibold text-purple-300 mb-3">
                    {getSharedTheories().length} Shared Theor{getSharedTheories().length !== 1 ? 'ies' : 'y'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getSharedTheories().map(theory => (
                      <span
                        key={theory}
                        className="rounded-lg border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300"
                      >
                        {formatTheoryName(theory)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Individual Protein Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Individual Protein Details</h2>
            {selectedProteins.map(symbol => {
              const data = proteinData.get(symbol);
              if (!data) return null;

              return (
                <div key={symbol} className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-400">{symbol}</h3>
                      <p className="text-sm text-slate-400">{data.name}</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-semibold text-indigo-400">
                      {data.papers?.length || 0} papers
                    </span>
                  </div>

                  {data.papers && data.papers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-white">Top Papers:</p>
                      {data.papers.slice(0, 5).map(paper => (
                        <div key={paper.pmcid} className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-white flex-1">{paper.title}</p>
                            <span className="text-xs text-slate-500 whitespace-nowrap">{paper.year}</span>
                          </div>
                          {paper.pmid && (
                            <a
                              href={`https://europepmc.org/article/MED/${paper.pmid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                            >
                              PMID: {paper.pmid}
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty State */}
      {selectedProteins.length === 0 && !loading && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-12 text-center">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
              <svg className="h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">No proteins selected</h3>
            <p className="mt-2 text-sm text-slate-400">
              Select 2-4 proteins from the dropdown above to compare their functions,
              papers, and aging theory associations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
