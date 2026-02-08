 import { Link, useLocation } from 'react-router-dom';
  import { useState } from 'react';
  import { LogOut } from 'lucide-react';
  import { useAuth } from '../../hooks/useAuth';

  const navigation = [
    { 
      name: 'Dashboard', 
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: 'Integrations', 
      path: '/integrations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: 'System Map', 
      path: '/system-map',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      name: 'Data Intelligence',
      path: '/data-flow',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      name: 'Recommendations',
      path: '/recommendations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  export default function Sidebar() {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout, isLoggingOut } = useAuth();

    const initials = user?.email
      ? user.email.substring(0, 2).toUpperCase()
      : '??';
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const displayEmail = user?.email || '';

    return (
      <>
        <style>{`
          .sidebar-glassmorphism {
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%);
            backdrop-filter: blur(16px);
            border-right: 1px solid rgba(255, 255, 255, 0.08);
          }

          .nav-item {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .nav-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
            transform: scaleY(0);
            transition: transform 0.2s ease;
          }

          .nav-item.active::before {
            transform: scaleY(1);
          }

          .nav-item:hover {
            transform: translateX(2px);
          }

          .mobile-menu-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 40;
            animation: fadeIn 0.2s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .mobile-menu-slide {
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-gray-900/90 backdrop-blur-sm border border-gray-700 flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div 
            className="mobile-menu-overlay lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          sidebar-glassmorphism
          fixed lg:static inset-y-0 left-0 z-50
          w-64 min-h-screen p-6
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0 mobile-menu-slide' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-white text-lg font-bold leading-tight">Marketing Intel</h1>
                  <p className="text-gray-500 text-xs">Platform</p>
                </div>
              </div>
              
              {/* Close button for mobile */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigation.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    nav-item
                    flex items-center space-x-3 px-4 py-3 rounded-lg
                    text-sm font-medium transition-all
                    ${isActive 
                      ? 'active bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <span className={isActive ? 'text-blue-400' : 'text-gray-500'}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer/User Section */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-3 rounded-lg bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{displayName}</p>
                  <p className="text-gray-500 text-xs truncate">{displayEmail}</p>
                </div>
                <button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }