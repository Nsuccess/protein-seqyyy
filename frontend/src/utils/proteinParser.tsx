import React from 'react';
import ProteinLink from '@/components/ProteinLink';

// Common GenAge protein symbols (subset - can be expanded)
const COMMON_PROTEINS = [
  'APOE', 'TP53', 'SIRT1', 'SIRT3', 'SIRT6', 'FOXO3', 'FOXO1', 'MTOR', 'IGF1', 'GH1',
  'TERT', 'WRN', 'LMNA', 'SOD1', 'SOD2', 'CAT', 'GPX1', 'PARP1', 'ATM', 'BRCA1',
  'CDKN2A', 'RB1', 'MYC', 'BCL2', 'BAX', 'NFKB1', 'TNF', 'IL6', 'INS', 'INSR',
  'AKT1', 'PIK3CA', 'PTEN', 'VEGFA', 'HIF1A', 'PPARG', 'PPARGC1A', 'NRF2', 'KEAP1'
];

export function parseProteinsInText(text: string, onView3D?: (protein: string) => void): React.ReactNode[] {
  // Create regex pattern for protein names (word boundaries)
  const proteinPattern = new RegExp(`\\b(${COMMON_PROTEINS.join('|')})\\b`, 'g');
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = proteinPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add protein link
    const protein = match[1];
    parts.push(
      <ProteinLink
        key={`${protein}-${match.index}`}
        symbol={protein}
        hasStructure={false} // Can be enhanced to check actual structure availability
        onView3D={onView3D ? () => onView3D(protein) : undefined}
      />
    );
    
    lastIndex = match.index + protein.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

export function extractProteinsFromText(text: string): string[] {
  const proteinPattern = new RegExp(`\\b(${COMMON_PROTEINS.join('|')})\\b`, 'g');
  const matches = text.match(proteinPattern);
  return matches ? Array.from(new Set(matches)) : [];
}
