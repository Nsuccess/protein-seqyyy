'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<'home' | 'query' | 'stats' | 'compare' | 'demo'>('home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🧬</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Aging Protein Research Platform</h1>
                <p className="text-sm text-gray-600">308 Proteins • 7,018 Papers • 495K ML Instructions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'home', label: '🏠 Home', color: 'blue' },
              { id: 'query', label: '🔍 RAG Query', color: 'green' },
              { id: 'stats', label: '📊 Statistics', color: 'orange' },
              { id: 'compare', label: '⚖️ Compare', color: 'indigo' },
              { id: 'demo', label: '🎬 Demo', color: 'pink' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as 'home' | 'query' | 'stats' | 'compare' | 'demo')}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                  activeSection === tab.id
                    ? `border-b-2 border-${tab.color}-600 text-${tab.color}-600`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeSection === 'home' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to the Aging Protein Platform</h2>
              <p className="text-lg text-gray-600 mb-6">
                Explore 308 aging-related proteins with RAG-powered search, interactive visualizations, and ML-enhanced predictions.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">308</div>
                  <div className="text-sm text-blue-800">GenAge Proteins</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600">7,018</div>
                  <div className="text-sm text-purple-800">Scientific Papers</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="text-3xl font-bold text-green-600">823</div>
                  <div className="text-sm text-green-800">Aging Theories</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                  <div className="text-3xl font-bold text-indigo-600">495K</div>
                  <div className="text-sm text-indigo-800">ML Instructions</div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveSection('query')}
                  className="text-left bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 hover:shadow-lg transition-all"
                >
                  <div className="text-2xl mb-2">🔍</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">RAG Query</h3>
                  <p className="text-sm text-gray-600">Search proteins with natural language queries and filters</p>
                </button>

                <button
                  onClick={() => setActiveSection('stats')}
                  className="text-left bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 hover:shadow-lg transition-all"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Statistics Dashboard</h3>
                  <p className="text-sm text-gray-600">Interactive charts and Mol-Instructions stats</p>
                </button>

                <button
                  onClick={() => setActiveSection('compare')}
                  className="text-left bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200 hover:shadow-lg transition-all"
                >
                  <div className="text-2xl mb-2">⚖️</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Protein Comparison</h3>
                  <p className="text-sm text-gray-600">Compare up to 4 proteins side-by-side</p>
                </button>

                <button
                  onClick={() => setActiveSection('demo')}
                  className="text-left bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200 hover:shadow-lg transition-all"
                >
                  <div className="text-2xl mb-2">🎬</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Interactive Demo</h3>
                  <p className="text-sm text-gray-600">Guided tour with auto-play examples</p>
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Direct Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Link href="/query" className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-center font-medium">
                  Query Interface
                </Link>
                <Link href="/stats" className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-center font-medium">
                  Statistics
                </Link>
                <Link href="/compare" className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-center font-medium">
                  Compare
                </Link>
                <Link href="/demo" className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 text-center font-medium">
                  Demo Mode
                </Link>
                <Link href="/proteins" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-center font-medium">
                  Browse Proteins
                </Link>
                <Link href="/theories" className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-center font-medium">
                  Theories
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'query' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">RAG Query Interface</h2>
            <p className="text-gray-600 mb-4">The full query interface is available at:</p>
            <Link href="/query" className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Open Query Interface →
            </Link>
          </div>
        )}

        {activeSection === 'stats' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Statistics Dashboard</h2>
            <p className="text-gray-600 mb-4">View comprehensive statistics and Mol-Instructions data:</p>
            <Link href="/stats" className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
              Open Statistics Dashboard →
            </Link>
          </div>
        )}

        {activeSection === 'compare' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Protein Comparison</h2>
            <p className="text-gray-600 mb-4">Compare multiple proteins side-by-side:</p>
            <Link href="/compare" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
              Open Comparison Tool →
            </Link>
          </div>
        )}

        {activeSection === 'demo' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Interactive Demo</h2>
            <p className="text-gray-600 mb-4">Take a guided tour of all features:</p>
            <Link href="/demo" className="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">
              Start Demo →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
