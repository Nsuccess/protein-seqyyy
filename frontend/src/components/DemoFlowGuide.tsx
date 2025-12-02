"use client";

import Link from "next/link";
import { useState } from "react";

interface DemoStep {
  id: number;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  example?: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: "Ask a Question",
    description: "Start with any protein question - our AI finds aging connections",
    href: "/query",
    icon: "🤖",
    color: "from-blue-500 to-cyan-500",
    example: "What role does SIRT6 play in aging?"
  },
  {
    id: 2,
    title: "Click Protein Links",
    description: "Proteins in the answer are clickable - explore them instantly",
    href: "/query?q=How%20does%20p53%20affect%20cellular%20senescence",
    icon: "🔗",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: 3,
    title: "View 3D Structure",
    description: "See interactive molecular structures with inline previews",
    href: "/protein-detail/SIRT6",
    icon: "🔬",
    color: "from-purple-500 to-pink-500"
  },
  {
    id: 4,
    title: "Generate Art",
    description: "Create artistic protein visualizations with ProteinCHAOS",
    href: "/protein-detail/TP53",
    icon: "🎨",
    color: "from-orange-500 to-red-500"
  }
];

const EXAMPLE_QUERIES = [
  { query: "What role does SIRT6 play in aging?", proteins: ["SIRT6"] },
  { query: "How does p53 affect cellular senescence?", proteins: ["TP53"] },
  { query: "What is the relationship between mTOR and longevity?", proteins: ["MTOR"] },
  { query: "How do sirtuins regulate metabolism?", proteins: ["SIRT1", "SIRT3"] },
  { query: "What proteins are involved in DNA repair and aging?", proteins: ["ATM", "BRCA1"] }
];

export default function DemoFlowGuide() {
  const [selectedQuery, setSelectedQuery] = useState(0);

  return (
    <div className="space-y-8">
      {/* Demo Flow Steps */}
      <div className="rounded-3xl border-2 border-[var(--accent-primary)] bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            🚀 Demo Flow: RAG → Proteins → 3D → Art
          </h2>
          <p className="text-[var(--foreground-muted)]">
            Experience the complete journey from question to visualization
          </p>
        </div>

        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {DEMO_STEPS.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              className="group relative rounded-2xl border-2 border-transparent bg-white p-5 shadow-md hover:border-[var(--accent-primary)] hover:shadow-xl transition-all"
            >
              {/* Step Number */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white text-sm font-bold flex items-center justify-center shadow-md">
                {step.id}
              </div>
              
              {/* Arrow connector */}
              {index < DEMO_STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 text-[var(--accent-primary)] text-xl z-10">
                  →
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                {step.icon}
              </div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">{step.title}</h3>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{step.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick Start with Example Queries */}
        <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6">
          <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <span>⚡</span> Quick Start - Click to Try
          </h3>
          
          <div className="grid gap-3 mb-4">
            {EXAMPLE_QUERIES.map((item, index) => (
              <button
                key={index}
                onClick={() => setSelectedQuery(index)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedQuery === index
                    ? 'border-[var(--accent-primary)] bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-[var(--accent-primary)] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--foreground)]">&quot;{item.query}&quot;</p>
                    <div className="flex gap-2 mt-2">
                      {item.proteins.map(p => (
                        <span key={p} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                          🧬 {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedQuery === index && (
                    <span className="text-[var(--accent-primary)] text-xl">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <Link
            href={`/query?q=${encodeURIComponent(EXAMPLE_QUERIES[selectedQuery].query)}`}
            className="block w-full text-center bg-gradient-to-r from-[var(--accent-primary)] to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg transition-all text-lg"
          >
            🚀 Start Demo with Selected Query
          </Link>
        </div>
      </div>
    </div>
  );
}
