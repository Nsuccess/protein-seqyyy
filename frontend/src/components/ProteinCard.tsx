"use client";

import Link from "next/link";

type Protein = {
  genage_id: string;
  symbol: string;
  name: string;
  uniprot: string;
  entrez_gene_id: string;
  categories: string[];
};

type ProteinCardProps = {
  protein: Protein;
};

export default function ProteinCard({ protein }: ProteinCardProps) {
  return (
    <Link
      href={`/protein/${protein.symbol.toLowerCase()}`}
      className="group block rounded-2xl border border-[var(--border-color)] bg-[var(--background-elevated)] p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-primary)] font-medium">
            {protein.symbol}
          </p>
          <h3 className="mt-2 text-lg font-semibold leading-tight">
            {protein.name}
          </h3>
        </div>
        
        {/* UniProt Badge */}
        {protein.uniprot && (
          <div className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent-primary)]">
            {protein.uniprot}
          </div>
        )}
      </div>

      {/* GenAge ID */}
      <div className="mt-3 text-xs text-[var(--foreground-subtle)]">
        GenAge ID: {protein.genage_id}
      </div>

      {/* Categories */}
      {protein.categories && protein.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {protein.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--foreground-muted)] border border-[var(--border-color)]"
            >
              {category}
            </span>
          ))}
          {protein.categories.length > 3 && (
            <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--foreground-subtle)]">
              +{protein.categories.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* View Details Link */}
      <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)]">
        <span>View details</span>
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
