'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DemoExample {
  id: number;
  title: string;
  description: string;
  query: string;
  filters?: {
    protein?: string;
    theories?: string[];
  };
  action: 'query' | 'compare' | 'stats' | 'proteins';
  expectedHighlights: string[];
}

const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: 1,
    title: "Query: APOE's Role in Aging",
    description: "Discover how APOE protein influences aging and longevity through our RAG system",
    query: "What is the role of APOE in aging?",
    filters: { protein: "APOE" },
    action: 'query',
    expectedHighlights: [
      "APOE protein function",
      "Alzheimer's disease connection",
      "Lipid metabolism and aging"
    ]
  },
  {
    id: 2,
    title: "Compare: SIRT6 vs TP53",
    description: "Side-by-side comparison of two key longevity proteins",
    query: "Compare SIRT6 and TP53 functions",
    action: 'compare',
    expectedHighlights: [
      "DNA repair mechanisms",
      "Cellular senescence",
      "Shared and unique papers"
    ]
  },
  {
    id: 3,
    title: "Theory: Mitochondrial Dysfunction",
    description: "Explore proteins associated with mitochondrial aging",
    query: "Show proteins related to mitochondrial dysfunction",
    filters: { theories: ["mitochondrial_dysfunction"] },
    action: 'query',
    expectedHighlights: [
      "Energy metabolism",
      "Oxidative stress",
      "Mitochondrial proteins"
    ]
  },
  {
    id: 4,
    title: "Query: Longevity-Associated Proteins",
    description: "Identify proteins linked to extended lifespan",
    query: "Which proteins are associated with longevity?",
    action: 'query',
    expectedHighlights: [
      "Lifespan extension",
      "Genetic associations",
      "Centenarian studies"
    ]
  },
  {
    id: 5,
    title: "Theory: Cellular Senescence",
    description: "Understand the mechanisms of cellular aging",
    query: "Explain cellular senescence mechanisms",
    filters: { theories: ["cellular_senescence"] },
    action: 'query',
    expectedHighlights: [
      "Cell cycle arrest",
      "SASP factors",
      "Senolytic interventions"
    ]
  },
  {
    id: 6,
    title: "Explore: Dataset Statistics",
    description: "View comprehensive statistics about our 308 proteins and 7,018 papers",
    query: "View dataset statistics",
    action: 'stats',
    expectedHighlights: [
      "Protein coverage",
      "Theory distribution",
      "Publication timeline"
    ]
  }
];

export default function DemoMode() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const currentExample = DEMO_EXAMPLES[currentStep];
  const isLastStep = currentStep === DEMO_EXAMPLES.length - 1;
  const isFirstStep = currentStep === 0;

  // Auto-advance timer
  useEffect(() => {
    if (!isAutoPlaying) {
      setProgress(0);
      return;
    }

    const duration = 8000; // 8 seconds per step
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      setCurrentStep(0);
      setIsAutoPlaying(false);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleExecute = () => {
    const example = currentExample;
    
    switch (example.action) {
      case 'query':
        const queryParams = new URLSearchParams({ q: example.query });
        if (example.filters?.protein) {
          queryParams.append('protein', example.filters.protein);
        }
        if (example.filters?.theories) {
          example.filters.theories.forEach(theory => {
            queryParams.append('theory', theory);
          });
        }
        router.push(`/query?${queryParams.toString()}`);
        break;
      case 'compare':
        router.push('/compare');
        break;
      case 'stats':
        router.push('/stats');
        break;
      case 'proteins':
        router.push('/proteins');
        break;
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsAutoPlaying(false);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Demo Progress
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary)]">
              Step {currentStep + 1} of {DEMO_EXAMPLES.length}
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-[var(--foreground-subtle)] hover:text-[var(--accent-primary)] transition-colors"
          >
            Reset
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / DEMO_EXAMPLES.length) * 100}%` }}
          />
        </div>
        {isAutoPlaying && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Current Example Card */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-white to-[var(--accent-soft)] p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white font-bold text-lg">
                {currentExample.id}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  {currentExample.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                  {currentExample.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Query Display */}
        <div className="mb-6 rounded-xl border border-[var(--border-color)] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] mb-2">
            Example Query
          </p>
          <p className="text-lg font-medium text-[var(--foreground)]">
            &quot;{currentExample.query}&quot;
          </p>
          
          {currentExample.filters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {currentExample.filters.protein && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Protein: {currentExample.filters.protein}
                </span>
              )}
              {currentExample.filters.theories?.map(theory => (
                <span
                  key={theory}
                  className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"
                >
                  Theory: {theory.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expected Highlights */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-3">
            What you will discover:
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {currentExample.expectedHighlights.map((highlight, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
              >
                <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-green-900">{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleExecute}
          className="w-full rounded-xl bg-[var(--accent-primary)] px-6 py-4 text-base font-semibold text-white transition-all hover:bg-[var(--accent-primary-hover)] hover:shadow-lg"
        >
          {currentExample.action === 'query' && '🔍 Execute Query'}
          {currentExample.action === 'compare' && '⚖️ Open Comparison Tool'}
          {currentExample.action === 'stats' && '📊 View Statistics'}
          {currentExample.action === 'proteins' && '🧬 Browse Proteins'}
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all ${
              isAutoPlaying
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isAutoPlaying ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause Auto-Play
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Auto-Play
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={isLastStep && !isAutoPlaying}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLastStep ? 'Restart' : 'Next'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* All Examples Overview */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          All Demo Examples
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_EXAMPLES.map((example, index) => (
            <button
              key={example.id}
              onClick={() => {
                setCurrentStep(index);
                setIsAutoPlaying(false);
              }}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
                currentStep === index
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-color)] bg-white hover:border-[var(--accent-primary)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  currentStep === index
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {example.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {example.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)] line-clamp-2">
                    {example.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
