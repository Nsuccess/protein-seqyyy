'use client';

import { useEffect, useState } from 'react';

interface ProteinArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  proteinSymbol: string;
  pdbId: string;
}

export default function ProteinArtModal({ isOpen, onClose, proteinSymbol, pdbId }: ProteinArtModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ProteinCHAOS hosted on GitHub Pages - we'll open it with the PDB ID
  const proteinChaosUrl = `https://dzyla.github.io/ProteinCHAOS/`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl mx-4 h-[90vh] bg-[#09090b] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="text-xl font-bold text-white">
                Protein Art Generator
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {proteinSymbol} • PDB: {pdbId} • Powered by ProteinCHAOS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10 transition-colors text-white"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instructions Banner */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 px-6 py-3">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Quick Start:</span> Enter <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-blue-300">{pdbId}</span> in the PDB ID field and click <span className="font-semibold text-green-400">Fetch</span> → then <span className="font-semibold text-blue-400">Initialize & Start</span> to generate art!
          </p>
        </div>

        {/* iframe Container */}
        <div className="relative h-[calc(100%-140px)]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#09090b] z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading ProteinCHAOS...</p>
              </div>
            </div>
          )}
          <iframe
            src={proteinChaosUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            title={`ProteinCHAOS Art Generator for ${proteinSymbol}`}
          />
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#09090b]/95 backdrop-blur px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/dzyla/ProteinCHAOS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                ProteinCHAOS by Dawid Zyla
              </a>
              <span className="text-gray-600">•</span>
              <span className="text-xs text-gray-500">
                MD-inspired protein art generator
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
