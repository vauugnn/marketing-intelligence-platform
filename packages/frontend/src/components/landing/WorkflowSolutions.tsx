import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Target, TrendingUp, Shield, CheckCircle2, Network } from 'lucide-react';

const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function WorkflowSolutions() {
    const [activeTeam, setActiveTeam] = useState(0);

    const teams = [
        {
            icon: BarChart3,
            title: 'For Operations Teams',
            description: 'Create efficient, repeatable processes that reduce manual work, speed up decisions, and keep your entire operation running smoothly.',
            benefits: [
                'Automate repetitive, high-volume tasks',
                'Maintain consistency across daily workflows',
                'Reduce human error with intelligent checks',
                'Enable faster coordination across departments'
            ]
        },
        {
            icon: Target,
            title: 'For Marketing Teams',
            description: 'Understand your marketing ecosystem as a whole, not just individual channels.',
            benefits: [
                'See channel synergies and isolation visually',
                'Identify underperforming parts system-wide',
                'Get actionable recommendations with ROI impact',
                'Cross-verify platform claims with actual data'
            ]
        },
        {
            icon: TrendingUp,
            title: 'For Growth Leaders',
            description: 'Make data-driven decisions with confidence using verified, cross-platform insights.',
            benefits: [
                'Understand system-level performance',
                'Track momentum across all channels',
                'Verify attribution accuracy',
                'Predict financial impact of changes'
            ]
        },
        {
            icon: Shield,
            title: 'For Business Analysts',
            description: 'Clean, reliable data that actually matches your financial reality.',
            benefits: [
                'Platform truth verification',
                'Custom pixel + GA4 cross-check',
                'Automated anomaly detection',
                'Professional-grade reporting'
            ]
        }
    ];

    return (
        <section id="workflow-solutions" className="py-32 bg-white dark:bg-[#162044]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-6"
                        >
                            <Network className="w-4 h-4" />
                            Workflow Solutions
                        </motion.span>

                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                            Designed for Every{' '}
                            <span className="bg-gradient-to-r from-[#fc763f] to-[#e05a2b] bg-clip-text text-transparent">
                                Workflow
                            </span>
                            , Across Every Team
                        </h2>

                        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                            Whether you're analyzing data, creating content, or automating operations, the platform adapts effortlessly to your team's unique needs.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-[#fc763f]/5 to-[#e05a2b]/5 rounded-3xl"
                                animate={{
                                    background: [
                                        'linear-gradient(to bottom right, rgba(252, 118, 63, 0.05), rgba(224, 90, 43, 0.05))',
                                        'linear-gradient(to bottom right, rgba(224, 90, 43, 0.05), rgba(252, 118, 63, 0.05))',
                                        'linear-gradient(to bottom right, rgba(252, 118, 63, 0.05), rgba(224, 90, 43, 0.05))'
                                    ]
                                }}
                                transition={{ duration: 4, repeat: Infinity }}
                            />

                            <svg viewBox="0 0 400 400" className="w-full relative z-10">
                                <defs>
                                    <linearGradient id="sphereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#fc763f" />
                                        <stop offset="50%" stopColor="#e05a2b" />
                                        <stop offset="100%" stopColor="#fc763f" />
                                    </linearGradient>
                                </defs>

                                <motion.circle
                                    cx="200" cy="200" r="80"
                                    fill="url(#sphereGrad)"
                                    opacity="0.9"
                                    animate={{
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                />

                                <motion.ellipse
                                    cx="200" cy="200" rx="120" ry="40"
                                    fill="none"
                                    stroke="#fc763f"
                                    strokeWidth="2"
                                    opacity="0.4"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    style={{ transformOrigin: '200px 200px' }}
                                />

                                <motion.ellipse
                                    cx="200" cy="200" rx="40" ry="120"
                                    fill="none"
                                    stroke="#e05a2b"
                                    strokeWidth="2"
                                    opacity="0.4"
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    style={{ transformOrigin: '200px 200px' }}
                                />

                                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                                    <motion.circle
                                        key={angle}
                                        cx={200 + 140 * Math.cos((angle * Math.PI) / 180)}
                                        cy={200 + 140 * Math.sin((angle * Math.PI) / 180)}
                                        r="8"
                                        fill="#fc763f"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1, 0.8, 1] }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                    />
                                ))}
                            </svg>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
                >
                    {teams.map((team, index) => (
                        <motion.div
                            key={team.title}
                            variants={fadeInUp}
                            whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(252, 118, 63, 0.15)' }}
                            onClick={() => setActiveTeam(index)}
                            className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${activeTeam === index
                                ? 'bg-gradient-to-br from-[#fc763f] to-[#e05a2b] text-white shadow-xl shadow-orange-500/25'
                                : 'bg-gray-50 dark:bg-[#162044] hover:bg-white dark:hover:bg-[#1e2d5c] border border-transparent hover:border-gray-100 dark:border-gray-700'
                                }`}
                        >
                            <team.icon className={`w-8 h-8 mb-4 ${activeTeam === index ? 'text-white' : 'text-[#fc763f]'}`} />
                            <h3 className={`font-bold mb-2 ${activeTeam === index ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {team.title}
                            </h3>
                        </motion.div>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTeam}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="mt-12 p-8 bg-gray-50 dark:bg-[#111936] rounded-3xl"
                    >
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{teams[activeTeam].title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{teams[activeTeam].description}</p>
                        <ul className="grid sm:grid-cols-2 gap-3">
                            {teams[activeTeam].benefits.map((benefit, i) => (
                                <motion.li
                                    key={benefit}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-3 text-gray-700"
                                >
                                    <div className="w-6 h-6 rounded-full bg-[#fc763f]/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-[#fc763f]" />
                                    </div>
                                    {benefit}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
}
