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
        <h3 className="text-lg font-semibold text-white mb-2">
          Try asking about...
        </h3>
        <p className="text-sm text-slate-400">
          Ask any question about proteins — we will find aging connections automatically
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map(category => (
          <div
            key={category.category}
            className="rounded-2xl border border-white/10 bg-[#0d1525] p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{category.icon}</span>
              <h4 className="font-semibold text-white">
                {category.category}
              </h4>
            </div>
            <div className="space-y-2">
              {category.queries.map(query => (
                <button
                  key={query}
                  onClick={() => onQuerySelect(query)}
                  className="w-full text-left rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                >
                  &quot;{query}&quot;
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
