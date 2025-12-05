'use client';

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [currentProtein, setCurrentProtein] = useState(0);
  const featuredProteins = [
    { symbol: 'SIRT6', pdb: '3pki', name: 'Sirtuin 6' },
    { symbol: 'TP53', pdb: '1tup', name: 'Tumor Protein P53' },
    { symbol: 'MTOR', pdb: '4jsv', name: 'mTOR Kinase' },
    { symbol: 'FOXO3', pdb: '2uzk', name: 'Forkhead Box O3' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProtein((prev) => (prev + 1) % featuredProteins.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredProteins.length]);

  const currentPdb = featuredProteins[currentProtein];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans">
      {/* ===== HERO SECTION - Schrödinger style dark gradient + molecular glow ===== */}
      <header className="relative overflow-hidden">
        {/* Schrödinger-style molecular glow background */}
        <div className="absolute inset-0">
          {/* Deep blue base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#1a1040]" />
          
          {/* Glowing orbs like Schrödinger's molecular visualization */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Navigation - Benchling style clean nav */}
        <nav className="relative z-10 border-b border-white/5">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-xl">🧬</span>
                </div>
                <span className="text-lg font-semibold tracking-tight">AgingProteins.ai</span>
              </div>
              <div className="hidden md:flex items-center gap-8">
                <Link href="/query" className="text-sm text-slate-300 hover:text-white transition-colors">Search</Link>
                <Link href="/proteins" className="text-sm text-slate-300 hover:text-white transition-colors">Proteins</Link>
                <Link href="/theories" className="text-sm text-slate-300 hover:text-white transition-colors">Theories</Link>
                <Link 
                  href="/query" 
                  className="text-sm font-medium bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Try AI Search
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Tagline + CTAs - Benchling bold style */}
            <div className="max-w-xl">
              {/* Status badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">AI-Powered Research Platform</span>
              </div>

              {/* Main headline - Schrödinger "Opening new worlds" style */}
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                <span className="text-white">Opening new worlds for</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  aging research
                </span>
              </h1>

              {/* Subheadline - Benchling clear value prop */}
              <p className="text-xl text-slate-400 leading-relaxed mb-10">
                Ask questions in plain English. Get AI-synthesized answers from{' '}
                <span className="text-white font-medium">7,000+ research papers</span>, linked to{' '}
                <span className="text-white font-medium">interactive 3D protein structures</span>.
              </p>

              {/* CTAs - Schrödinger dual button style */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/query"
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-xl font-semibold text-base hover:bg-slate-100 transition-all shadow-lg shadow-white/10"
                >
                  Explore Platform
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href={`/protein-detail/${currentPdb.symbol}`}
                  className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/10 transition-all"
                >
                  View 3D Structures
                </Link>
              </div>

              {/* Trust signals - Benchling style logos */}
              <div className="pt-8 border-t border-white/10">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">Powered by</p>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-lg">🧬</span>
                    <span className="text-sm font-medium">GenAge</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-lg">🔬</span>
                    <span className="text-sm font-medium">UniProt</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-lg">🏗️</span>
                    <span className="text-sm font-medium">PDB</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-lg">📚</span>
                    <span className="text-sm font-medium">PubMed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: 3D Protein Visual - Schrödinger molecular style */}
            <div className="relative">
              {/* Glow effect behind the card */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
              
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d1525]/80 backdrop-blur-xl shadow-2xl">
                {/* 3D Protein Image - Using reliable PDB images */}
                <div className="relative aspect-square bg-gradient-to-br from-[#0a0f1a] to-[#1a1040]">
                  <img
                    src={`https://cdn.rcsb.org/images/structures/${currentPdb.pdb}_assembly-1.jpeg`}
                    alt={`${currentPdb.symbol} protein structure`}
                    className="w-full h-full object-cover opacity-90"
                    onError={(e) => {
                      // Fallback to a different image format if needed
                      const target = e.target as HTMLImageElement;
                      target.src = `https://cdn.rcsb.org/images/structures/${currentPdb.pdb}_model-1.jpeg`;
                    }}
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1525] via-transparent to-transparent" />
                  
                  {/* Protein info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Currently viewing</p>
                        <h3 className="text-2xl font-bold text-white">{currentPdb.symbol}</h3>
                        <p className="text-sm text-slate-400">{currentPdb.name}</p>
                      </div>
                      <Link
                        href={`/protein-detail/${currentPdb.symbol}`}
                        className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Protein selector dots */}
                <div className="flex items-center justify-center gap-2 py-4 bg-[#0d1525]">
                  {featuredProteins.map((protein, i) => (
                    <button
                      key={protein.symbol}
                      onClick={() => setCurrentProtein(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        i === currentProtein
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {protein.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floating stats - Schrödinger style */}
              <div className="absolute -bottom-6 -left-6 px-5 py-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl shadow-blue-500/20">
                <p className="text-3xl font-bold">308</p>
                <p className="text-xs text-blue-200">Aging Proteins</p>
              </div>
              <div className="absolute -top-6 -right-6 px-5 py-4 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-xl shadow-purple-500/20">
                <p className="text-3xl font-bold">7,018</p>
                <p className="text-xs text-purple-200">Papers Indexed</p>
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* ===== SCHRÖDINGER-STYLE GRADIENT CARDS SECTION ===== */}
      <section className="py-24 bg-[#0d1525]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Two Powerful Capabilities</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Combining AI-powered literature search with interactive molecular visualization
            </p>
          </div>

          {/* Schrödinger-style gradient cards (like their Life Science / Materials Science split) */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* AI Search Card - Orange/Coral gradient like Schrödinger */}
            <Link 
              href="/query"
              className="group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-orange-500/20 via-red-500/10 to-transparent border border-orange-500/20 hover:border-orange-500/40 transition-all"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-2xl mb-6">
                  🔍
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-orange-300 transition-colors">
                  AI Literature Search
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Ask questions in natural language. Our RAG pipeline searches 7,000+ papers and synthesizes answers with citations.
                </p>
                <div className="flex items-center gap-2 text-orange-400 font-medium">
                  <span>Try AI Search</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* 3D Structures Card - Blue/Cyan gradient like Schrödinger */}
            <Link 
              href="/proteins"
              className="group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent border border-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl mb-6">
                  🧬
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-300 transition-colors">
                  3D Protein Structures
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Explore 308 aging-related proteins with interactive 3D visualization from PDB. Rotate, zoom, and analyze.
                </p>
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <span>Browse Proteins</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== BENCHLING-STYLE FEATURE BLOCKS ===== */}
      <section className="py-24 bg-[#0a0f1a]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm text-blue-400 uppercase tracking-wider font-medium mb-3">Why researchers choose us</p>
            <h2 className="text-4xl font-bold mb-4">Built for Aging Research</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Everything you need to accelerate your aging biology research
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🤖",
                title: "RAG-Powered Search",
                description: "FAISS vector search over 7K+ papers with semantic chunking and GPT-4 synthesis"
              },
              {
                icon: "🔗",
                title: "Clickable Proteins",
                description: "Every protein mentioned in answers links directly to detailed information and 3D structures"
              },
              {
                icon: "🔬",
                title: "Interactive 3D",
                description: "Explore molecular structures from PDB with full rotation, zoom, and visualization controls"
              },
              {
                icon: "📊",
                title: "Aging Relevance",
                description: "Automatic scoring of how findings connect to established aging mechanisms"
              },
              {
                icon: "📚",
                title: "Source Citations",
                description: "Every answer includes direct links to original research papers on PubMed"
              },
              {
                icon: "🧬",
                title: "Theory Mapping",
                description: "Connect findings to 11 hallmarks of aging including telomere attrition and senescence"
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xl mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EXAMPLE QUERIES - Schrödinger pipeline style ===== */}
      <section className="py-24 bg-[#0d1525]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">See It In Action</h2>
            <p className="text-slate-400 text-lg">Click any question to see the AI analyze scientific literature</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              { q: "What role does SIRT6 play in DNA repair and aging?", proteins: ["SIRT6"] },
              { q: "How does p53 regulate cellular senescence?", proteins: ["TP53"] },
              { q: "What is the relationship between mTOR and longevity?", proteins: ["MTOR"] },
              { q: "How do mitochondrial proteins affect lifespan?", proteins: ["SOD2", "SIRT3"] },
            ].map((item, i) => (
              <Link
                key={i}
                href={`/query?q=${encodeURIComponent(item.q)}`}
                className="group flex items-start gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white group-hover:text-blue-300 transition-colors mb-2">{item.q}</p>
                  <div className="flex gap-2">
                    {item.proteins.map(p => (
                      <span key={p} className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECHNICAL ARCHITECTURE ===== */}
      <section className="py-24 bg-[#0a0f1a]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm text-purple-400 uppercase tracking-wider font-medium mb-3">Under the hood</p>
            <h2 className="text-4xl font-bold mb-4">Technical Architecture</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Built with cutting-edge AI and biomolecular data sources
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: "📄", title: "RAG Pipeline", desc: "FAISS vector search with semantic chunking", color: "blue" },
              { icon: "🤖", title: "LLM Synthesis", desc: "GPT-4 with protein entity recognition", color: "purple" },
              { icon: "🧬", title: "Bio Databases", desc: "GenAge + UniProt + PDB integration", color: "green" },
              { icon: "📊", title: "Mol-Instructions", desc: "495K biomolecular instructions", color: "orange" },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-${item.color}-500/20 to-${item.color}-600/10 border border-${item.color}-500/20 flex items-center justify-center text-2xl`}>
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-32 bg-gradient-to-b from-[#0d1525] to-[#0a0f1a]">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Ready to explore aging biology?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Ask any question about proteins and aging. Get AI-powered answers in seconds.
          </p>
          <Link
            href="/query"
            className="inline-flex items-center gap-3 bg-white text-slate-900 px-10 py-5 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all shadow-lg shadow-white/10"
          >
            Start Exploring
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/5 py-16 bg-[#0a0f1a]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl">🧬</span>
                </div>
                <div>
                  <span className="font-bold text-xl text-white">AgingProteins.ai</span>
                  <p className="text-xs text-slate-500">AI-Powered Aging Research</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                Accelerating aging research with AI. Search 7,000+ papers, explore 308 proteins, 
                and visualize 3D molecular structures — all in one platform.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Explore</h4>
              <div className="space-y-3">
                <Link href="/query" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">AI Search</Link>
                <Link href="/proteins" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">Protein Database</Link>
                <Link href="/theories" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">Aging Theories</Link>
                <Link href="/stats" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">Statistics</Link>
              </div>
            </div>
            
            {/* Data Sources */}
            <div>
              <h4 className="font-semibold text-white mb-4">Data Sources</h4>
              <div className="space-y-3">
                <a href="https://genomics.senescence.info/genes/" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">GenAge Database</a>
                <a href="https://www.uniprot.org/" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">UniProt</a>
                <a href="https://www.rcsb.org/" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">RCSB PDB</a>
                <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-blue-400 transition-colors">PubMed</a>
              </div>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2025 AgingProteins.ai — Built with 💙 for AISOC Hackathon
            </p>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                RAG + LLM
              </span>
              <span className="px-3 py-1 text-xs bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                Next.js + FastAPI
              </span>
              <span className="px-3 py-1 text-xs bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                FAISS + GPT-4
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
