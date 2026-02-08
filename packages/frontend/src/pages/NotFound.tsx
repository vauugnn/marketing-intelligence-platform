import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0e27]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-8"
            >
                <h1 className="text-9xl font-bold text-[#fc763f] mb-4">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Page Not Found</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#fc763f] to-[#e05a2b] text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
                >
                    Go Home
                </button>
            </motion.div>
        </div>
    );
}
