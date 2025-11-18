'use client';

import { useEffect } from 'react';
import ProteinViewer from './viewer/ProteinViewer';

interface StructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  proteinSymbol: string;
  pdbId: string;
}

export default function StructureModal({ isOpen, onClose, proteinSymbol, pdbId }: StructureModalProps) {
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
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              {proteinSymbol} - 3D Structure
            </h2>
            <p className="text-sm text-[var(--foreground-subtle)] mt-1">
              PDB ID: {pdbId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/50 transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Viewer */}
        <div className="p-6 bg-[var(--background)]">
          <div style={{ height: '70vh', minHeight: '500px' }}>
            <ProteinViewer pdbId={pdbId} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-color)] bg-[var(--background)] px-6 py-4">
          <div className="flex items-center justify-between">
            <a
              href={`https://www.rcsb.org/structure/${pdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              <span>View on RCSB PDB</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-primary)]/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
