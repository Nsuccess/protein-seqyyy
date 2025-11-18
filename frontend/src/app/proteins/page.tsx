"use client";

import { useState, useEffect } from "react";
import ProteinCard from "@/components/ProteinCard";
import Navigation from "@/components/Navigation";

type Protein = {
  genage_id: string;
  symbol: string;
  name: string;
  uniprot: string;
  entrez_gene_id: string;
  categories: string[];
};

type SortOption = "name" | "symbol" | "category";

export default function ProteinsPage() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [filteredProteins, setFilteredProteins] = useState<Protein[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("symbol");
  
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch proteins from API
  useEffect(() => {
    async function fetchProteins() {
      try {
        const response = await fetch("http://localhost:8000/proteins/genage");
        if (!response.ok) {
          throw new Error("Failed to fetch proteins");
        }
        const data = await response.json();
        setProteins(data.proteins || []);
        
        // Extract unique categories
        const allCategories = new Set<string>();
        data.proteins?.forEach((p: Protein) => {
          p.categories?.forEach((cat: string) => allCategories.add(cat));
        });
        setCategories(Array.from(allCategories).sort());
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    }

    fetchProteins();
  }, []);

  // Filter and sort proteins
  useEffect(() => {
    let result = [...proteins];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.symbol.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      result = result.filter((p) =>
        p.categories?.includes(selectedCategory)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "symbol":
          return a.symbol.localeCompare(b.symbol);
        case "category":
          return (a.categories?.[0] || "").localeCompare(b.categories?.[0] || "");
        default:
          return 0;
      }
    });

    setFilteredProteins(result);
  }, [proteins, searchQuery, selectedCategory, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent"></div>
          <p className="mt-4 text-[var(--foreground-muted)]">Loading proteins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-semibold">Error loading proteins</p>
          <p className="mt-2 text-sm text-red-500">{error}</p>
          <p className="mt-4 text-xs text-[var(--foreground-muted)]">
            Make sure the backend server is running on http://localhost:8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navigation />
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.45em] text-[var(--accent-primary)]">
                GenAge Database
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Aging-Related Proteins
              </h1>
              <p className="mt-3 max-w-2xl text-base text-[var(--foreground-muted)]">
                Explore {proteins.length} proteins from the Human Ageing Genomic Resources database
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-elevated)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--foreground-subtle)]">Total Proteins</p>
            <p className="mt-2 text-3xl font-semibold">{proteins.length}</p>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              aging-related genes
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-elevated)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--foreground-subtle)]">Filtered</p>
            <p className="mt-2 text-3xl font-semibold">{filteredProteins.length}</p>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              matching criteria
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-elevated)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--foreground-subtle)]">Categories</p>
            <p className="mt-2 text-3xl font-semibold">{categories.length}</p>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              classification types
            </p>
          </div>
        </section>

        {/* Filters and Search */}
        <section className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by symbol or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-sm focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--foreground-muted)]">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              >
                <option value="symbol">Symbol</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--background-elevated)] text-[var(--foreground-muted)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              All ({proteins.length})
            </button>
            {categories.map((category) => {
              const count = proteins.filter((p) =>
                p.categories?.includes(category)
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--background-elevated)] text-[var(--foreground-muted)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </section>

        {/* Protein Grid */}
        <section>
          {filteredProteins.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-elevated)] p-12 text-center">
              <p className="text-[var(--foreground-muted)]">
                No proteins found matching your criteria
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProteins.map((protein) => (
                <ProteinCard key={protein.symbol} protein={protein} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
