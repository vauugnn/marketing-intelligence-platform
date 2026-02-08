import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, TrendingUp, Target } from 'lucide-react';

export default function Hero() {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <section ref={containerRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0e27] dark:via-[#0f1535] dark:to-[#0a0e27]">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-[#fc763f]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#e05a2b]/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#fc763f]/5 to-[#e05a2b]/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <motion.div
                        style={{ y, opacity }}
                        className="space-y-8"
                    >
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fc763f]/10 border border-[#fc763f]/20"
                        >
                            <Sparkles className="w-4 h-4 text-[#fc763f]" />
                            <span className="text-sm font-semibold text-[#e05a2b]">Marketing Intelligence Platform</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight"
                        >
                            See Your Marketing{' '}
                            <span className="bg-gradient-to-r from-[#fc763f] to-[#e05a2b] bg-clip-text text-transparent">
                                As a System
                            </span>
                            , Not Scattered Channels
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg"
                        >
                            A channel-agnostic system that evaluates marketing as an interconnected ecosystem. Map synergies, verify platform truth, and get AI recommendations with financial impact.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-wrap gap-4"
                        >
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(252, 118, 63, 0.4)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/auth')}
                                className="px-8 py-4 rounded-full bg-gradient-to-r from-[#fc763f] to-[#e05a2b] text-white font-semibold text-lg shadow-xl shadow-orange-500/30 flex items-center gap-2"
                            >
                                Experience the Platform
                                <ArrowRight className="w-5 h-5" />
                            </motion.button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400"
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#fc763f]" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#fc763f]" />
                                <span>14-day free trial</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="relative"
                    >
                        <div className="relative w-full aspect-square">
                            <motion.div
                                animate={{
                                    rotateX: [0, 10, 0],
                                    rotateY: [0, -10, 0],
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-0"
                                style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
                            >
                                <svg viewBox="0 0 600 600" className="w-full h-full">
                                    <defs>
                                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#fc763f" stopOpacity="0.8" />
                                            <stop offset="100%" stopColor="#e05a2b" stopOpacity="0.6" />
                                        </linearGradient>
                                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#e05a2b" stopOpacity="0.9" />
                                            <stop offset="100%" stopColor="#fc763f" stopOpacity="0.7" />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    <motion.g
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    >
                                        <path d="M300 100 L450 200 L450 400 L300 500 L150 400 L150 200 Z"
                                            fill="url(#grad1)" opacity="0.3" />
                                        <path d="M300 150 L400 220 L400 380 L300 450 L200 380 L200 220 Z"
                                            fill="url(#grad2)" opacity="0.5" />

                                        <motion.path
                                            d="M300 180 L370 230 L370 370 L300 420 L230 370 L230 230 Z"
                                            fill="#fc763f"
                                            opacity="0.9"
                                            animate={{
                                                fill: ['#fc763f', '#e05a2b', '#fc763f'],
                                            }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        />

                                        <motion.circle cx="300" cy="100" r="12" fill="#fc763f" filter="url(#glow)"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                        <motion.circle cx="450" cy="200" r="8" fill="#e05a2b" filter="url(#glow)"
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                                        />
                                        <motion.circle cx="450" cy="400" r="10" fill="#fc763f" filter="url(#glow)"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
                                        />
                                        <motion.circle cx="300" cy="500" r="14" fill="#e05a2b" filter="url(#glow)"
                                            animate={{ scale: [1, 1.25, 1] }}
                                            transition={{ duration: 2.8, repeat: Infinity, delay: 0.9 }}
                                        />
                                        <motion.circle cx="150" cy="400" r="8" fill="#fc763f" filter="url(#glow)"
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 2.3, repeat: Infinity, delay: 1.2 }}
                                        />
                                        <motion.circle cx="150" cy="200" r="10" fill="#e05a2b" filter="url(#glow)"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2.6, repeat: Infinity, delay: 1.5 }}
                                        />

                                        <motion.path
                                            d="M300 100 L450 200" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 0.8 }}
                                        />
                                        <motion.path
                                            d="M450 200 L450 400" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 1 }}
                                        />
                                        <motion.path
                                            d="M450 400 L300 500" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 1.2 }}
                                        />
                                        <motion.path
                                            d="M300 500 L150 400" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 1.4 }}
                                        />
                                        <motion.path
                                            d="M150 400 L150 200" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 1.6 }}
                                        />
                                        <motion.path
                                            d="M150 200 L300 100" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 1.8 }}
                                        />

                                        <motion.path
                                            d="M300 100 L300 180" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 2 }}
                                        />
                                        <motion.path
                                            d="M450 200 L370 230" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 2.1 }}
                                        />
                                        <motion.path
                                            d="M450 400 L370 370" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 2.2 }}
                                        />
                                        <motion.path
                                            d="M300 500 L300 420" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 2.3 }}
                                        />
                                        <motion.path
                                            d="M150 400 L230 370" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 2.4 }}
                                        />
                                        <motion.path
                                            d="M150 200 L230 230" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 2.5 }}
                                        />
                                    </motion.g>
                                </svg>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 1 }}
                                className="absolute -top-4 -right-4 bg-white dark:bg-[#162044] rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fc763f] to-[#e05a2b] flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Impact</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">+47%</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 1.2 }}
                                className="absolute -bottom-4 -left-4 bg-white dark:bg-[#162044] rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e05a2b] to-[#fc763f] flex items-center justify-center">
                                        <Target className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Attribution Accuracy</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">99.2%</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
