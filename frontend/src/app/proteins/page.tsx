"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiEndpoint } from "@/lib/api";

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

  useEffect(() => {
    async function fetchProteins() {
      try {
        const response = await fetch(apiEndpoint("/proteins/genage"));
        if (!response.ok) throw new Error("Failed to fetch proteins");
        const data = await response.json();
        setProteins(data.proteins || []);
        
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

  useEffect(() => {
    let result = [...proteins];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.symbol.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
      );
    }
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.categories?.includes(selectedCategory));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "symbol": return a.symbol.localeCompare(b.symbol);
        case "category": return (a.categories?.[0] || "").localeCompare(b.categories?.[0] || "");
        default: return 0;
      }
    });
    setFilteredProteins(result);
  }, [proteins, searchQuery, selectedCategory, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading proteins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400 font-semibold">Error loading proteins</p>
          <p className="mt-2 text-sm text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🧬</span>
              </div>
              <span className="text-lg font-semibold">AgingProteins.ai</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/query" className="text-sm text-slate-400 hover:text-white transition-colors">Search</Link>
              <Link href="/theories" className="text-sm text-slate-400 hover:text-white transition-colors">Theories</Link>
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0d1525]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400 mb-2">GenAge Database</p>
          <h1 className="text-3xl font-bold">Aging-Related Proteins</h1>
          <p className="mt-2 text-slate-400">Explore {proteins.length} proteins from the Human Ageing Genomic Resources database</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
            <p className="text-sm text-slate-500">Total Proteins</p>
            <p className="mt-2 text-3xl font-bold">{proteins.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
            <p className="text-sm text-slate-500">Filtered</p>
            <p className="mt-2 text-3xl font-bold">{filteredProteins.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-6">
            <p className="text-sm text-slate-500">Categories</p>
            <p className="mt-2 text-3xl font-bold">{categories.length}</p>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search by symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="symbol" className="bg-[#0d1525]">Sort by Symbol</option>
              <option value="name" className="bg-[#0d1525]">Sort by Name</option>
              <option value="category" className="bg-[#0d1525]">Sort by Category</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              All ({proteins.length})
            </button>
            {categories.map((category) => {
              const count = proteins.filter((p) => p.categories?.includes(category)).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-500 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
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
            <div className="rounded-2xl border border-white/10 bg-[#0d1525] p-12 text-center">
              <p className="text-slate-400">No proteins found matching your criteria</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProteins.map((protein) => (
                <Link
                  key={protein.symbol}
                  href={`/protein-detail/${protein.symbol}`}
                  className="group rounded-2xl border border-white/10 bg-[#0d1525] p-6 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {protein.symbol}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">{protein.name}</p>
                    </div>
                    <span className="text-2xl">🧬</span>
                  </div>
                  {protein.categories?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {protein.categories.slice(0, 2).map((cat) => (
                        <span key={cat} className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-xs text-slate-500 group-hover:text-blue-400 transition-colors">
                    View details →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
