export default function SystemMap() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">System Map</h2>
      <p className="text-gray-600 mb-8">Visualize how your marketing channels work together</p>

      <div className="bg-white p-12 rounded-lg shadow min-h-96 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg">Network visualization will appear here</p>
          <p className="text-sm mt-2">Connect platforms and wait 30 days for journey data</p>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900">Legend:</h4>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>• <strong>Thick solid lines</strong> = Work very well together</li>
          <li>• <strong>Medium lines</strong> = Some reinforcement</li>
          <li>• <strong>Broken lines</strong> = Isolated, doesn't help others</li>
          <li>• <strong>Bigger nodes</strong> = More revenue</li>
        </ul>
      </div>
    </div>
  );
}
