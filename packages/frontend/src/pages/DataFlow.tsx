import { usePerformance } from '../hooks/useAnalytics';
import DataPipelineFlow from '../components/data-flow/DataPipelineFlow';

export default function DataFlow() {
  const { data: channels = [], isLoading: loadingPerformance } = usePerformance();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <style>{`
        .glass-card {
          background: linear-gradient(135deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 30, 0.9) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .grid-pattern {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 ml-14 lg:ml-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            Data Intelligence
          </h1>
          <p className="text-gray-400 text-sm">
            Visualize how data flows from your platforms and tracking pixel into actionable insights
          </p>
        </div>

        {/* Section 1: Data Pipeline Flow */}
        <div className="mb-6">
          <DataPipelineFlow channels={channels} isLoading={loadingPerformance} />
        </div>
      </div>
    </div>
  );
}
