'use client';

interface ExampleQueriesProps {
  onQuerySelect: (query: string) => void;
}

export default function ExampleQueries({ onQuerySelect }: ExampleQueriesProps) {
  const examples = [
    {
      category: 'Aging-Specific',
      icon: '🧓',
      queries: [
        'What is the role of SIRT6 in aging?',
        'How does telomere attrition contribute to aging?',
        'Which proteins are involved in cellular senescence?',
      ]
    },
    {
      category: 'General Protein',
      icon: '🧬',
      queries: [
        'What is the function of p53?',
        'How does insulin signaling work?',
        'What are heat shock proteins?',
      ]
    },
    {
      category: 'Comparative',
      icon: '⚖️',
      queries: [
        'Compare FOXO3 and FOXO1 functions',
        'What are the differences between SOD1 and SOD2?',
        'How do sirtuins differ from each other?',
      ]
    },
    {
      category: 'Mechanistic',
      icon: '⚙️',
      queries: [
        'How does mTOR regulate autophagy?',
        'What pathways does AMPK activate?',
        'How do mitochondria contribute to aging?',
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          Try asking about...
        </h3>
        <p className="text-sm text-[var(--foreground-subtle)]">
          Ask any question about proteins - we'll find aging connections automatically
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map(category => (
          <div
            key={category.category}
            className="rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{category.icon}</span>
              <h4 className="font-semibold text-[var(--foreground)]">
                {category.category}
              </h4>
            </div>
            <div className="space-y-2">
              {category.queries.map(query => (
                <button
                  key={query}
                  onClick={() => onQuerySelect(query)}
                  className="w-full text-left rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground-muted)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] transition-all"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
