import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', path: '/' },
  { name: 'Integrations', path: '/integrations' },
  { name: 'System Map', path: '/system-map' },
  { name: 'Recommendations', path: '/recommendations' }
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-gray-900 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-white text-xl font-bold">Marketing Intel</h1>
        <p className="text-gray-400 text-sm">Platform</p>
      </div>

      <nav className="space-y-2">
        {navigation.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-3 rounded transition-colors ${
              location.pathname === item.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
