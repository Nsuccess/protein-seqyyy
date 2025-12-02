'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiEndpoint } from '@/lib/api';

interface Chunk {
  id: string;
  text: string;
  score: number;
  pmcid: string;
  pmid?: string;
  title: string;
  year: number;
  proteins: string[];
  theories: string[];
}

interface QueryResultsProps {
  answer: string;
  chunks: Chunk[];
  citations: string[];
  metadata: {
    confidence: number;
    proteins_mentioned: string[];
    theories_identified: string[];
    query_time_ms: number;
    filters_applied: {
      protein?: string;
      theories?: string[];
    };
    chunks_retrieved: number;
  };
  agingRelevance?: {
    has_aging_connection: boolean;
    relevance_score: number;
    connections: string[];
    aging_theories: string[];
  };
  isGeneralQuery?: boolean;
}

export default function QueryResults({ answer, chunks, citations, metadata, agingRelevance }: QueryResultsProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  if (!answer || !chunks || !metadata) {
    return <div className="text-slate-400">Loading results...</div>;
  }

  const renderAnswerWithLinks = (text: string) => {
    if (!metadata.proteins_mentioned?.length) return text;
    
    const proteinPattern = new RegExp(`\\b(${metadata.proteins_mentioned.join('|')})\\b`, 'gi');
    const parts = text.split(proteinPattern);
    
    return parts.map((part, index) => {
      const isProtein = metadata.proteins_mentioned.some(
        p => p.toLowerCase() === part.toLowerCase()
      );
      if (isProtein) {
        const symbol = metadata.proteins_mentioned.find(
          p => p.toLowerCase() === part.toLowerCase()
        ) || part;
        return (
          <Link
            key={index}
            href={`/protein-detail/${symbol}`}
            className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 font-semibold text-blue-400 hover:bg-blue-500/30 transition-all border border-blue-500/30"
          >
            <span>🧬</span>
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const formatConfidence = (confidence: number) => `${(confidence * 100).toFixed(1)}%`;
  const formatQueryTime = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

  const toggleChunk = (id: string) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedChunks(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedChunks(new Set());
    } else {
      setExpandedChunks(new Set(chunks.map(c => c.id)));
    }
    setExpandAll(!expandAll);
  };

  return (
    <div className="space-y-6">
      {/* Metadata Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#0d1525] px-6 py-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Confidence:</span>
          <span className="font-semibold text-blue-400">{formatConfidence(metadata.confidence)}</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Query time:</span>
          <span className="font-medium text-white">{formatQueryTime(metadata.query_time_ms)}</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Sources:</span>
          <span className="font-medium text-white">{metadata.chunks_retrieved}</span>
        </div>
        {metadata.proteins_mentioned?.length > 0 && (
          <>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500">Proteins:</span>
              {metadata.proteins_mentioned.map(protein => (
                <Link
                  key={protein}
                  href={`/protein-detail/${protein}`}
                  className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                  {protein}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Answer Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Answer</h2>
        <div className="prose-custom text-slate-300 leading-relaxed whitespace-pre-wrap">
          {renderAnswerWithLinks(answer)}
        </div>
      </div>

      {/* Aging Relevance */}
      {agingRelevance && agingRelevance.has_aging_connection && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🧬</span>
            <div>
              <h3 className="font-semibold text-green-400">Aging Relevance</h3>
              <p className="text-sm text-green-300">
                {agingRelevance.relevance_score >= 0.7 ? 'High' : agingRelevance.relevance_score >= 0.4 ? 'Medium' : 'Low'}
                ({(agingRelevance.relevance_score * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          {agingRelevance.connections?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-2">Connections to Aging:</p>
              <ul className="text-sm text-slate-300 space-y-1">
                {agingRelevance.connections.slice(0, 5).map((conn, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    {conn}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {agingRelevance.aging_theories?.length > 0 && (
            <div>
              <p className="text-sm text-slate-400 mb-2">Related Aging Theories:</p>
              <div className="flex flex-wrap gap-2">
                {agingRelevance.aging_theories.map(theory => (
                  <span key={theory} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                    {theory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Protein Previews */}
      {metadata.proteins_mentioned?.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
          <h3 className="font-semibold text-white mb-4">🧬 Explore Proteins Mentioned</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metadata.proteins_mentioned.map(protein => (
              <Link
                key={protein}
                href={`/protein-detail/${protein}`}
                className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-center group"
              >
                <div className="text-2xl mb-2">🧬</div>
                <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">{protein}</p>
                <p className="text-xs text-slate-500 mt-1">View 3D Structure →</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">🔍 Retrieved Sources ({chunks.length})</h3>
          <button
            onClick={toggleExpandAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <div className="space-y-3">
          {chunks.map((chunk, index) => (
            <div
              key={chunk.id}
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <button
                onClick={() => toggleChunk(chunk.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    Score: {(chunk.score * 100).toFixed(1)}%
                  </span>
                  {chunk.year >= 2020 && (
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                      ✨ {chunk.year} (Recent)
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform ${expandedChunks.has(chunk.id) || expandAll ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="px-4 pb-3">
                <p className="text-sm font-medium text-white mb-1">{chunk.title}</p>
                <p className="text-xs text-slate-500">{chunk.year} • {chunk.pmcid}</p>
              </div>
              {(expandedChunks.has(chunk.id) || expandAll) && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <p className="text-sm text-slate-400 leading-relaxed">{chunk.text}</p>
                  {chunk.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${chunk.pmid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs text-blue-400 hover:text-blue-300"
                    >
                      View on PubMed →
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
