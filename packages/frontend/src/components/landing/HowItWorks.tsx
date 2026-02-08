import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Eye, Shield, Network, Sparkles, RefreshCw, Zap } from 'lucide-react';

export default function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const lineHeight = useTransform(scrollYProgress, [0, 0.5], ["0%", "100%"]);

    const steps = [
        {
            icon: Eye,
            title: 'Dual Tracking',
            description: 'Custom pixel + Google Analytics 4 cross-verification for complete visibility.',
            color: '#fc763f'
        },
        {
            icon: Shield,
            title: 'Platform Truth Verification',
            description: 'Cross-reference platform claims against actual payment data to verify accuracy.',
            color: '#e05a2b'
        },
        {
            icon: Network,
            title: 'System Intelligence',
            description: 'Visual network mapping of channel synergies and isolation across your ecosystem.',
            color: '#fc763f'
        },
        {
            icon: Sparkles,
            title: 'AI Recommendations',
            description: 'Specific actions with financial impact predictions to optimize performance.',
            color: '#e05a2b'
        },
        {
            icon: RefreshCw,
            title: 'CAPI Feedback Loop',
            description: 'Send verified conversions back to platforms for better optimization.',
            color: '#fc763f'
        }
    ];

    return (
        <section ref={containerRef} id="how-it-works" className="py-32 bg-gradient-to-b from-gray-50 to-white dark:from-[#0a0e27] dark:to-[#0f1535]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fc763f]/10 border border-[#fc763f]/20 text-sm font-semibold text-[#e05a2b] mb-6">
                        <Zap className="w-4 h-4" />
                        How It Works
                    </span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                        From Data to Decisions
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                        A seamless workflow that transforms scattered marketing data into actionable system intelligence.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Background Line (Gray/Faint) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 hidden lg:block" />

                    {/* Animated Progress Line */}
                    <motion.div
                        style={{ height: lineHeight }}
                        className="absolute left-1/2 top-0 w-0.5 bg-gradient-to-b from-[#fc763f] via-[#e05a2b] to-[#fc763f] hidden lg:block origin-top"
                    />

                    <div className="space-y-12 lg:space-y-24">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className={`relative flex flex-col lg:flex-row items-center gap-8 ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                                    }`}
                            >
                                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                                    <div
                                        className="bg-white dark:bg-[#162044] p-8 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 inline-block"
                                    >
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                                        <p className="text-gray-600 dark:text-gray-300 max-w-md">{step.description}</p>
                                    </div>
                                </div>

                                <div
                                    className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#fc763f] to-[#e05a2b] shadow-xl shadow-orange-500/30"
                                >
                                    <step.icon className="w-8 h-8 text-white" />
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-[#162044] flex items-center justify-center shadow-lg">
                                        <span className="text-sm font-bold text-[#fc763f]">{index + 1}</span>
                                    </div>
                                </div>

                                <div className="flex-1" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
