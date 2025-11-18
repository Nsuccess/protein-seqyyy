import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧬</span>
            <h1 className="text-xl font-bold text-gray-900">Aging Research Platform</h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/proteins"
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/proteins'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Proteins (307)
            </Link>
            <Link
              href="/theories"
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/theories'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Theories (823)
            </Link>
            <Link
              href="/query"
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/query'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              RAG Query
            </Link>
            <Link
              href="/stats"
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/stats'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Statistics
            </Link>
            <Link
              href="/compare"
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/compare'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Compare
            </Link>
            <Link
              href="/demo"
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/demo'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Demo
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
