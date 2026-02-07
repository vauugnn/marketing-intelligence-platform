import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Integrations from './pages/Integrations';
import SystemMap from './pages/SystemMap';
import Recommendations from './pages/Recommendations';
import { ToastContainer } from './components/ui/Toast';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Sidebar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/system-map" element={<SystemMap />} />
            <Route path="/recommendations" element={<Recommendations />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </Router>
  );
}

export default App;