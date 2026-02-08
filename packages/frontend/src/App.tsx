import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Integrations from './pages/Integrations';
import SystemMap from './pages/SystemMap';
import Recommendations from './pages/Recommendations';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
          queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        }
      },
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/system-map" element={<SystemMap />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <ToastContainer />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
