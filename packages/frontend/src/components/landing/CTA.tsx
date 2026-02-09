import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function CTA() {
    const navigate = useNavigate();
    return (
        <section className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#fc763f] to-[#e05a2b]" />

            <motion.div
                animate={{
                    background: [
                        'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)'
                    ]
                }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute inset-0"
            />

            <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#162044]/20 backdrop-blur-sm text-sm font-semibold text-gray-900 dark:text-white mb-8"
                    >
                        <Sparkles className="w-4 h-4" />
                        Intelligent Marketing Starts Here
                    </motion.span>

                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                        Unlock a Smarter Way to Market
                    </h2>

                    <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                        Experience a refined AI platform built for clarity, intelligence, and exceptional marketing performance.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/auth')}
                        className="mx-auto px-8 py-4 rounded-full bg-white light:[#e05a2b] dark:bg-[#162044] text-[#e05a2b] font-bold text-lg shadow-xl flex items-center gap-2"
                    >
                        Get Started Free
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </motion.div>
            </div>
        </section>
    );
}
