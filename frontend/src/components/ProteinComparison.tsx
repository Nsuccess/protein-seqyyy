'use client';

import { useState, useEffect } from 'react';

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

  // Fetch available proteins on mount
  useEffect(() => {
    const fetchProteins = async () => {
      try {
        const response = await fetch('http://localhost:8000/proteins/genage');
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
      // Fetch basic protein info
      const proteinResponse = await fetch(`http://localhost:8000/protein/${symbol}`);
      if (!proteinResponse.ok) throw new Error('Failed to fetch protein data');
      const proteinInfo = await proteinResponse.json();

      // Fetch papers
      const papersResponse = await fetch(`http://localhost:8000/protein/${symbol}/papers?limit=20`);
      const papersData = await papersResponse.json();

      // Fetch UniProt data for sequence
      let sequence = '';
      let sequence_length = 0;
      try {
        const uniprotResponse = await fetch(`http://localhost:8000/protein/${symbol}/uniprot`);
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
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
          Select Proteins to Compare (up to 4)
        </h2>
        
        <div className="flex flex-wrap gap-3">
          {selectedProteins.map(symbol => {
            const data = proteinData.get(symbol);
            return (
              <div
                key={symbol}
                className="flex items-center gap-2 rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-soft)] px-4 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--accent-primary)]">{symbol}</p>
                  {data && (
                    <p className="text-xs text-[var(--foreground-muted)]">{data.name}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveProtein(symbol)}
                  className="text-[var(--accent-primary)] hover:text-red-600"
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
            <label htmlFor="protein-select" className="block text-sm font-medium text-[var(--foreground)] mb-2">
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
              className="w-full rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              disabled={loadingProteins || loading}
            >
              <option value="">Select a protein...</option>
              {availableProteins
                .filter(p => !selectedProteins.includes(p.symbol))
                .map(protein => (
                  <option key={protein.symbol} value={protein.symbol}>
                    {protein.symbol} - {protein.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-white p-8 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <span className="text-sm font-medium text-[var(--foreground-muted)]">
              Loading protein data...
            </span>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {selectedProteins.length > 0 && !loading && (
        <>
          {/* Overview Comparison */}
          <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)] overflow-x-auto">
            <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
              Protein Overview
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="py-3 px-4 text-left font-semibold text-[var(--foreground)]">Property</th>
                  {selectedProteins.map(symbol => (
                    <th key={symbol} className="py-3 px-4 text-left font-semibold text-[var(--accent-primary)]">
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-color)]">
                  <td className="py-3 px-4 font-medium text-[var(--foreground-subtle)]">Full Name</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-[var(--foreground)]">
                        {data?.name || '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-[var(--border-color)]">
                  <td className="py-3 px-4 font-medium text-[var(--foreground-subtle)]">UniProt ID</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4">
                        {data?.uniprot ? (
                          <a
                            href={`https://www.uniprot.org/uniprotkb/${data.uniprot}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent-primary)] hover:underline"
                          >
                            {data.uniprot}
                          </a>
                        ) : '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-[var(--border-color)]">
                  <td className="py-3 px-4 font-medium text-[var(--foreground-subtle)]">Sequence Length</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-[var(--foreground)]">
                        {data?.sequence_length ? `${data.sequence_length} aa` : '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-[var(--border-color)]">
                  <td className="py-3 px-4 font-medium text-[var(--foreground-subtle)]">Paper Count</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-[var(--foreground)]">
                        {data?.papers?.length || 0}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[var(--foreground-subtle)]">Why Aging-Related</td>
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    return (
                      <td key={symbol} className="py-3 px-4 text-[var(--foreground-muted)] text-xs">
                        {data?.why || '-'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Shared vs Unique Papers */}
          {selectedProteins.length >= 2 && (
            <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
                Paper Overlap Analysis
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {selectedProteins.map(symbol => {
                  const data = proteinData.get(symbol);
                  const paperCount = data?.papers?.length || 0;
                  const sharedCount = getSharedPapers().length;
                  const uniqueCount = paperCount - sharedCount;
                  
                  return (
                    <div key={symbol} className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-4">
                      <p className="text-sm font-semibold text-[var(--accent-primary)]">{symbol}</p>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--foreground-subtle)]">Total papers:</span>
                          <span className="font-semibold text-[var(--foreground)]">{paperCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--foreground-subtle)]">Unique:</span>
                          <span className="font-semibold text-blue-600">{uniqueCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--foreground-subtle)]">Shared:</span>
                          <span className="font-semibold text-green-600">{sharedCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {getSharedPapers().length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">
                    {getSharedPapers().length} Shared Paper{getSharedPapers().length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-green-700">
                    These papers mention all selected proteins
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Theory Overlap */}
          {selectedProteins.length >= 2 && (
            <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
                Aging Theory Overlap
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {selectedProteins.map(symbol => {
                  const data = proteinData.get(symbol);
                  const theories = new Set<string>();
                  data?.papers?.forEach(paper => {
                    paper.theories.forEach(theory => theories.add(theory));
                  });
                  
                  return (
                    <div key={symbol} className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-4">
                      <p className="text-sm font-semibold text-[var(--accent-primary)] mb-3">{symbol}</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(theories).slice(0, 5).map(theory => (
                          <span
                            key={theory}
                            className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                          >
                            {formatTheoryName(theory).split(' ').slice(0, 2).join(' ')}
                          </span>
                        ))}
                        {theories.size > 5 && (
                          <span className="text-xs text-[var(--foreground-subtle)]">
                            +{theories.size - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {getSharedTheories().length > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <p className="text-sm font-semibold text-purple-900 mb-3">
                    {getSharedTheories().length} Shared Theor{getSharedTheories().length !== 1 ? 'ies' : 'y'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getSharedTheories().map(theory => (
                      <span
                        key={theory}
                        className="rounded-lg border border-purple-300 bg-white px-3 py-1 text-xs font-medium text-purple-700"
                      >
                        {formatTheoryName(theory)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sequence Alignment View */}
          {selectedProteins.length >= 2 && selectedProteins.every(s => proteinData.get(s)?.sequence) && (
            <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
                Sequence Comparison
              </h2>
              <p className="mb-4 text-sm text-[var(--foreground-muted)]">
                Comparing sequence lengths and composition
              </p>
              
              <div className="space-y-4">
                {selectedProteins.map(symbol => {
                  const data = proteinData.get(symbol);
                  if (!data?.sequence) return null;
                  
                  const sequence = data.sequence;
                  const length = data.sequence_length || sequence.length;
                  
                  // Calculate amino acid composition
                  const composition: Record<string, number> = {};
                  for (const aa of sequence) {
                    composition[aa] = (composition[aa] || 0) + 1;
                  }
                  
                  // Get top 5 amino acids
                  const topAA = Object.entries(composition)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                  
                  return (
                    <div key={symbol} className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--accent-primary)]">{symbol}</p>
                          <p className="text-xs text-[var(--foreground-subtle)]">{length} amino acids</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--foreground-subtle)]">Top amino acids:</p>
                          <div className="flex gap-1 mt-1">
                            {topAA.map(([aa, count]) => (
                              <span
                                key={aa}
                                className="rounded bg-blue-100 px-2 py-0.5 text-xs font-mono font-semibold text-blue-700"
                                title={`${aa}: ${count} (${((count / length) * 100).toFixed(1)}%)`}
                              >
                                {aa}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Sequence preview */}
                      <div className="rounded bg-gray-50 p-3 font-mono text-xs leading-relaxed overflow-x-auto">
                        <div className="text-gray-600">
                          {sequence.substring(0, 60)}
                          {sequence.length > 60 && '...'}
                        </div>
                      </div>
                      
                      {/* Length comparison bar */}
                      <div className="mt-3">
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{
                              width: `${Math.min((length / Math.max(...selectedProteins.map(s => proteinData.get(s)?.sequence_length || 0))) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Sequence length comparison */}
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Length Comparison</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-blue-700">Shortest:</span>
                    <span className="ml-2 font-semibold text-blue-900">
                      {Math.min(...selectedProteins.map(s => proteinData.get(s)?.sequence_length || 0))} aa
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Longest:</span>
                    <span className="ml-2 font-semibold text-blue-900">
                      {Math.max(...selectedProteins.map(s => proteinData.get(s)?.sequence_length || 0))} aa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theory Overlap Venn Diagram */}
          {selectedProteins.length >= 2 && (
            <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
                Theory Overlap Visualization
              </h2>
              
              {/* Venn-style visualization */}
              <div className="mb-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedProteins.map(symbol => {
                    const data = proteinData.get(symbol);
                    const theories = new Set<string>();
                    data?.papers?.forEach(paper => {
                      paper.theories.forEach(theory => theories.add(theory));
                    });
                    
                    const sharedTheories = getSharedTheories();
                    const uniqueTheories = Array.from(theories).filter(t => !sharedTheories.includes(t));
                    
                    return (
                      <div key={symbol} className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4">
                        <p className="text-sm font-semibold text-purple-900 mb-3">{symbol}</p>
                        
                        {/* Shared theories */}
                        {sharedTheories.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">Shared:</p>
                            <div className="flex flex-wrap gap-1">
                              {sharedTheories.slice(0, 3).map(theory => (
                                <span
                                  key={theory}
                                  className="rounded-full bg-green-100 border border-green-300 px-2 py-0.5 text-xs font-medium text-green-800"
                                >
                                  {formatTheoryName(theory).split(' ').slice(0, 2).join(' ')}
                                </span>
                              ))}
                              {sharedTheories.length > 3 && (
                                <span className="text-xs text-green-700">+{sharedTheories.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Unique theories */}
                        {uniqueTheories.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-purple-700 mb-1">Unique:</p>
                            <div className="flex flex-wrap gap-1">
                              {uniqueTheories.slice(0, 3).map(theory => (
                                <span
                                  key={theory}
                                  className="rounded-full bg-purple-100 border border-purple-300 px-2 py-0.5 text-xs font-medium text-purple-800"
                                >
                                  {formatTheoryName(theory).split(' ').slice(0, 2).join(' ')}
                                </span>
                              ))}
                              {uniqueTheories.length > 3 && (
                                <span className="text-xs text-purple-700">+{uniqueTheories.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {theories.size === 0 && (
                          <p className="text-xs text-purple-600">No theories identified</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Theory statistics */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-700 mb-1">Shared Theories</p>
                  <p className="text-2xl font-bold text-green-900">{getSharedTheories().length}</p>
                  <p className="text-xs text-green-600 mt-1">Common across all proteins</p>
                </div>
                
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Total Unique</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {(() => {
                      const allTheories = new Set<string>();
                      selectedProteins.forEach(symbol => {
                        const data = proteinData.get(symbol);
                        data?.papers?.forEach(paper => {
                          paper.theories.forEach(theory => allTheories.add(theory));
                        });
                      });
                      return allTheories.size;
                    })()}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Distinct theories identified</p>
                </div>
                
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Overlap Score</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(() => {
                      const allTheories = new Set<string>();
                      selectedProteins.forEach(symbol => {
                        const data = proteinData.get(symbol);
                        data?.papers?.forEach(paper => {
                          paper.theories.forEach(theory => allTheories.add(theory));
                        });
                      });
                      const shared = getSharedTheories().length;
                      const total = allTheories.size;
                      return total > 0 ? `${((shared / total) * 100).toFixed(0)}%` : '0%';
                    })()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Theory similarity</p>
                </div>
              </div>
            </div>
          )}

          {/* Individual Protein Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Individual Protein Details
            </h2>
            {selectedProteins.map(symbol => {
              const data = proteinData.get(symbol);
              if (!data) return null;

              return (
                <div
                  key={symbol}
                  className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--accent-primary)]">
                        {symbol}
                      </h3>
                      <p className="text-sm text-[var(--foreground-muted)]">{data.name}</p>
                    </div>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-primary)]">
                      {data.papers?.length || 0} papers
                    </span>
                  </div>

                  {data.papers && data.papers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Top Papers:
                      </p>
                      {data.papers.slice(0, 5).map(paper => (
                        <div
                          key={paper.pmcid}
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--foreground)] flex-1">
                              {paper.title}
                            </p>
                            <span className="text-xs text-[var(--foreground-subtle)] whitespace-nowrap">
                              {paper.year}
                            </span>
                          </div>
                          {paper.pmid && (
                            <a
                              href={`https://europepmc.org/article/MED/${paper.pmid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
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
        <div className="rounded-3xl border border-[var(--border-color)] bg-white p-12 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <svg className="h-8 w-8 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              No proteins selected
            </h3>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              Select 2-4 proteins from the dropdown above to compare their functions,
              papers, and aging theory associations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
