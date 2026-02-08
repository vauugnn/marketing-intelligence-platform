import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Integrations from './pages/Integrations';
import SystemMap from './pages/SystemMap';
import Recommendations from './pages/Recommendations';
import DataFlow from './pages/DataFlow';
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

import { ThemeProvider } from './components/theme-provider';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-full w-full">{children}</main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
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
                    <Route path="/data-flow" element={<DataFlow />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <ToastContainer />
      </Router>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
